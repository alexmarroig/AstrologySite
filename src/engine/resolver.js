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
      suppressed_keys: suppressedKeys,
      reasons
    }
  };
};

module.exports = {
  resolveSnippets
};
