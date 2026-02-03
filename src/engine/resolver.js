const contentStore = require('../content/contentStore');

const cache = new Map();

const resolveSnippets = ({ tokens = [], service, contentVersion }) => {
  const cacheKey = `${contentVersion}:${service}:${tokens.slice().sort().join('|')}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  const meta = contentStore.getMeta();
  const reportConfig = contentStore.getReportConfig();
  const defaults = meta.defaults || { max_snippets_per_section: 6, max_total_snippets: 42 };

  const snippets = contentStore.getSnippetsByKeys(tokens);
  const applicable = snippets.filter((snippet) =>
    Array.isArray(snippet.service_scopes) && snippet.service_scopes.includes(service)
  );

  const ordered = applicable.sort((a, b) => {
    if ((b.priority || 0) !== (a.priority || 0)) {
      return (b.priority || 0) - (a.priority || 0);
    }
    return a.key.localeCompare(b.key);
  });

  const dedupeRules = reportConfig.dedupe_rules || [];
  const suppressedKeys = new Set();
  const suppressedReasons = [];

  const byKey = new Map(ordered.map((snippet) => [snippet.key, snippet]));

  const suppressKey = (key, reason) => {
    if (!suppressedKeys.has(key)) {
      suppressedKeys.add(key);
      suppressedReasons.push(reason);
    }
  };

  dedupeRules.forEach((rule) => {
    if (!rule.prefer_type || !Array.isArray(rule.suppress_types)) return;
    ordered
      .filter((snippet) => snippet.type === rule.prefer_type)
      .forEach((preferred) => {
        rule.suppress_types.forEach((type) => {
          if (type === 'planet_sign' || type === 'planet_house') {
            const planet = preferred.key.split('_')[0];
            ordered
              .filter((snippet) => snippet.type === type && snippet.key.startsWith(`${planet}_`))
              .forEach((snippet) => suppressKey(snippet.key, `${type} suprimido por ${preferred.key}`));
          }
          if (type === 'aspect') {
            const base = preferred.key.replace(/_house_\d+$/, '');
            if (byKey.has(base)) {
              suppressKey(base, `aspect suprimido por ${preferred.key}`);
            }
          }
        });
      });
  });

  const sections = {};
  const selectedKeys = [];

  const sectionsOrder = reportConfig.sections_order?.[service] || [];
  sectionsOrder.forEach((sectionId) => {
    sections[sectionId] = [];
  });

  const totalLimit = defaults.max_total_snippets || 42;
  const perSectionLimit = defaults.max_snippets_per_section || 6;

  const addToSection = (sectionId, snippet) => {
    if (!sections[sectionId]) {
      sections[sectionId] = [];
    }
    const limit = sectionId === 'summary' ? 2 : perSectionLimit;
    if (sections[sectionId].length >= limit) {
      return false;
    }
    if (selectedKeys.length >= totalLimit) {
      return false;
    }
    sections[sectionId].push(snippet);
    selectedKeys.push(snippet.key);
    return true;
  };

  ordered.forEach((snippet) => {
    if (suppressedKeys.has(snippet.key)) {
      return;
    }
    const targetSections = Array.isArray(snippet.sections) ? snippet.sections : [];
    let placed = false;
    for (const sectionId of targetSections) {
      if (addToSection(sectionId, snippet)) {
        placed = true;
        break;
      }
    }
    if (!placed) {
      suppressedKeys.add(snippet.key);
      suppressedReasons.push(`Sem espaço para ${snippet.key}`);
    }
  });

  const result = {
    content_version: contentVersion,
const fs = require('fs');
const path = require('path');

const SUMMARY_SECTION = 'summary';
const DEFAULT_CONTENT_FILE = 'astrolumen_content_v1.json';

const normalizeList = (list = []) =>
  list
    .map((item) => (typeof item === 'string' ? item.trim().toLowerCase() : item))
    .filter(Boolean);

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const matchesServiceScope = (serviceScopes = [], service = '') => {
  if (!Array.isArray(serviceScopes) || serviceScopes.length === 0) {
    return true;
  }
  const normalizedService = (service || '').toLowerCase();
  return normalizeList(serviceScopes).includes(normalizedService);
};

const loadContent = (contentVersion) => {
  const filename = DEFAULT_CONTENT_FILE;
  const contentPath = path.join(__dirname, '..', '..', 'data', filename);

  try {
    const raw = fs.readFileSync(contentPath, 'utf8');
    const parsed = JSON.parse(raw);

    if (contentVersion && parsed.meta?.content_version && contentVersion !== parsed.meta.content_version) {
      return parsed;
    }

    return parsed;
  } catch (error) {
    return {
      meta: { content_version: contentVersion || 'v1', defaults: {} },
      report_config: {},
      interpretation_library: { snippets: [] }
    };
  }
};

const normalizeDedupeRules = (dedupeRules = []) => {
  if (!Array.isArray(dedupeRules)) {
    return [];
  }
  return dedupeRules
    .map((rule) => {
      const primary = rule.primary || rule.primary_type;
      const suppresses = rule.suppresses || rule.remove_types;
      if (!primary || !Array.isArray(suppresses)) {
        return null;
      }
      return { primary, suppresses };
    })
    .filter(Boolean);
};

const applyDedupeRules = (snippets, dedupeRules) => {
  const rules = normalizeDedupeRules(dedupeRules);
  if (!rules.length) {
    return {
      deduped: snippets,
      suppressedKeys: [],
      reasons: []
    };
  }

  const primaryTypes = new Set(snippets.map((snippet) => snippet.type).filter(Boolean));
  const suppressedKeys = [];
  const reasons = [];

  const deduped = snippets.filter((snippet) => {
    for (const rule of rules) {
      if (!primaryTypes.has(rule.primary)) {
        continue;
      }
      if (rule.suppresses.includes(snippet.type)) {
        suppressedKeys.push(snippet.key);
        reasons.push(
          `Suprimido ${snippet.key} (${snippet.type}) porque ${rule.primary} está presente.`
        );
        return false;
      }
    }
    return true;
  });

  return { deduped, suppressedKeys, reasons };
};

const resolveSnippets = ({ tokens = [], service = '', contentVersion } = {}) => {
  const content = loadContent(contentVersion);
  const snippets = content.interpretation_library?.snippets || [];
  const reportConfig = content.report_config || {};
  const defaults = content.meta?.defaults || {};

  const tokensSet = new Set(tokens);

  const filtered = snippets.filter(
    (snippet) => tokensSet.has(snippet.key) && matchesServiceScope(snippet.service_scopes, service)
  );

  const ordered = [...filtered].sort((a, b) => {
    const priorityDiff = (b.priority || 0) - (a.priority || 0);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return (a.key || '').localeCompare(b.key || '');
  });

  const { deduped, suppressedKeys, reasons } = applyDedupeRules(
    ordered,
    reportConfig.dedupe_rules
  );

  const maxPerSection = isFiniteNumber(defaults.max_snippets_per_section)
    ? defaults.max_snippets_per_section
    : Number.POSITIVE_INFINITY;
  const maxTotal = isFiniteNumber(defaults.max_total_snippets)
    ? defaults.max_total_snippets
    : Number.POSITIVE_INFINITY;
  const summaryLimit = Math.min(
    2,
    isFiniteNumber(maxPerSection) ? maxPerSection : Number.POSITIVE_INFINITY
  );

  const sections = {};
  const selectedKeys = [];
  let totalCount = 0;

  for (const snippet of deduped) {
    if (totalCount >= maxTotal) {
      break;
    }

    const snippetSections = Array.isArray(snippet.sections) ? snippet.sections : [];

    for (const section of snippetSections) {
      if (!sections[section]) {
        sections[section] = [];
      }
      const limit = section === SUMMARY_SECTION ? summaryLimit : maxPerSection;
      if (sections[section].length < limit) {
        sections[section].push(snippet);
        selectedKeys.push(snippet.key);
        totalCount += 1;
        break;
      }
    }
  }

  return {
    content_version: content.meta?.content_version || contentVersion,
    service,
    sections,
    selected_keys: selectedKeys,
    debug: {
      suppressed_keys: Array.from(suppressedKeys),
      reasons: suppressedReasons
    }
  };
  cache.set(cacheKey, result);
  return result;
      suppressed_keys: suppressedKeys,
      reasons
    }
  };
};

module.exports = {
  resolveSnippets
};
