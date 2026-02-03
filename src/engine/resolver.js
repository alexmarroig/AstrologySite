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
};

module.exports = {
  resolveSnippets
};
