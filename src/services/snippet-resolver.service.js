const MAX_TOTAL_LIMIT = 42;
const DEFAULT_SECTION_LIMITS = {
  resumo: 3,
  identidade: 6,
  relacoes: 6,
  carreira: 6,
  ciclos: 6
};

const SECTION_BY_TAG = {
  resumo: ['summary', 'resumo', 'sintese', 'overview'],
  identidade: ['identidade', 'essencia', 'personalidade', 'autoconhecimento', 'transformacao'],
  relacoes: ['relacionamentos', 'relacoes', 'amor', 'parcerias', 'compatibilidade', 'sinastria'],
  carreira: ['carreira', 'profissao', 'vocacao', 'trabalho', 'proposito', 'financas'],
  ciclos: ['ciclos', 'timing', 'transitos', 'progressao', 'progressoes', 'ano', 'planejamento']
};

const VALID_SNIPPET_TYPES = new Set([
  'planet_sign_house',
  'aspect_house',
  'planet_sign',
  'planet_house',
  'aspect'
]);

const VALID_SERVICE_SCOPES = new Set([
  'natal',
  'predictions',
  'progressions',
  'synastry',
  'solar_return'
]);

const assertString = (value, label, index) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid snippet at index ${index}: ${label} must be a non-empty string.`);
  }
};

const assertStringArray = (value, label, index) => {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim() === '')) {
    throw new Error(`Invalid snippet at index ${index}: ${label} must be an array of strings.`);
  }
};

const validateSnippets = (snippets) => {
  if (!Array.isArray(snippets)) {
    throw new Error('Snippets must be provided as an array.');
  }

  snippets.forEach((snippet, index) => {
    if (!snippet || typeof snippet !== 'object') {
      throw new Error(`Invalid snippet at index ${index}: snippet must be an object.`);
    }

    assertString(snippet.key, 'key', index);
    assertString(snippet.type, 'type', index);
    assertString(snippet.title, 'title', index);
    assertString(snippet.text_md, 'text_md', index);

    if (!VALID_SNIPPET_TYPES.has(snippet.type)) {
      throw new Error(`Invalid snippet at index ${index}: unsupported type "${snippet.type}".`);
    }

    if (snippet.tags !== undefined) {
      assertStringArray(snippet.tags, 'tags', index);
    }

    if (snippet.service_scopes !== undefined) {
      assertStringArray(snippet.service_scopes, 'service_scopes', index);
      snippet.service_scopes.forEach((scope) => {
        if (!VALID_SERVICE_SCOPES.has(scope)) {
          throw new Error(`Invalid snippet at index ${index}: unsupported service scope "${scope}".`);
        }
      });
    }

    if (snippet.priority !== undefined && typeof snippet.priority !== 'number') {
      throw new Error(`Invalid snippet at index ${index}: priority must be a number.`);
    }
  });
};
const DEFAULT_CANONICAL_SECTIONS = Object.keys(DEFAULT_SECTION_LIMITS);
const DEFAULT_DEDUPE_RULES = [
  {
    primary_type: 'planet_sign_house',
    remove_types: ['planet_sign', 'planet_house'],
    match: 'planet_prefix'
  },
  {
    primary_type: 'aspect_house',
    remove_types: ['aspect'],
    match: 'aspect_contains'
  }
];

const normalizeList = (list = []) =>
  list.map((item) => (typeof item === 'string' ? item.toLowerCase() : item)).filter(Boolean);

const resolveSectionByTags = (tags = []) => {
  const normalizedTags = normalizeList(tags);
  for (const [section, keywords] of Object.entries(SECTION_BY_TAG)) {
    if (normalizedTags.some((tag) => keywords.includes(tag))) {
      return section;
    }
  }
  return 'resumo';
};

const resolveSections = (snippet) => {
  if (Array.isArray(snippet.sections) && snippet.sections.length > 0) {
    return normalizeList(snippet.sections);
  }
  return [resolveSectionByTags(snippet.tags || [])];
};

const matchesServiceScope = (serviceScopes = [], serviceType = '') => {
  if (!serviceScopes || serviceScopes.length === 0) {
    return true;
  }
  const normalized = serviceType.toLowerCase();
  return normalizeList(serviceScopes).some((scope) => scope === normalized);
};

const resolveSectionLimit = (section, reportConfig = {}) => {
  const sectionLimits = reportConfig.section_limits || {};
  const configured = sectionLimits[section];
  const defaultLimit = DEFAULT_SECTION_LIMITS[section] ?? DEFAULT_SECTION_LIMITS.resumo;
  if (typeof configured === 'number' && Number.isFinite(configured)) {
    return Math.min(configured, defaultLimit);
  }
  return defaultLimit;
};

const resolveTotalLimit = (reportConfig = {}) => {
  const configured = reportConfig.total_limit;
  if (typeof configured === 'number' && Number.isFinite(configured)) {
    return Math.min(configured, MAX_TOTAL_LIMIT);
  }
  return MAX_TOTAL_LIMIT;
};

const resolveSnippetPriority = (snippet, serviceType, reportConfig = {}) => {
  const basePriority = snippet.priority || 0;
  const perServicePriority =
    (snippet.service_priorities && snippet.service_priorities[serviceType]) || 0;
  const servicePriority = (reportConfig.service_priorities || {})[serviceType] || 0;
  return basePriority + perServicePriority + servicePriority;
};

const matchDedupeRule = (snippet, primaryKey, matchType) => {
  if (!primaryKey) {
    return false;
  }
  if (matchType === 'planet_prefix') {
    const [planet] = snippet.key.split('_');
    return primaryKey.startsWith(`${planet}_`);
  }
  if (matchType === 'aspect_contains') {
    const normalized = snippet.key.replace('aspect_', '');
    return primaryKey.includes(normalized);
  }
  if (matchType === 'exact') {
    return snippet.key === primaryKey;
  }
  if (matchType === 'prefix') {
    return primaryKey.startsWith(snippet.key);
  }
  if (matchType === 'includes') {
    return primaryKey.includes(snippet.key);
  }
  return false;
};

const dedupeSnippets = (snippets, dedupeRules = DEFAULT_DEDUPE_RULES) => {
  const rules = Array.isArray(dedupeRules) && dedupeRules.length ? dedupeRules : DEFAULT_DEDUPE_RULES;
  const primaryKeys = new Map();

  for (const rule of rules) {
    primaryKeys.set(rule.primary_type, new Set());
  }

  for (const snippet of snippets) {
    const ruleSet = primaryKeys.get(snippet.type);
    if (ruleSet) {
      ruleSet.add(snippet.key);
    }
  }

  return snippets.filter((snippet) => {
    for (const rule of rules) {
      if (!rule.remove_types || !rule.remove_types.includes(snippet.type)) {
        continue;
      }
      const keys = primaryKeys.get(rule.primary_type);
      if (!keys || keys.size === 0) {
        continue;
      }
      for (const primaryKey of keys) {
        if (matchDedupeRule(snippet, primaryKey, rule.match)) {
          return false;
        }
      }
    }
    return true;
  });
};

const resolveSnippets = (tokens, serviceType, contentVersion, snippets = []) => {
  validateSnippets(snippets);
const normalizeSection = (section, canonicalSections) => {
  if (canonicalSections.includes(section)) {
    return section;
  }
  return canonicalSections.includes('resumo') ? 'resumo' : canonicalSections[0];
};

const getCanonicalSections = (reportConfig = {}) => {
  const canonical =
    reportConfig.canonical_sections ||
    reportConfig.sections_canonical ||
    reportConfig.required_sections;
  const normalized = normalizeList(canonical);
  return normalized.length ? normalized : DEFAULT_CANONICAL_SECTIONS;
};

const buildSectionsOrder = (reportConfig = {}, canonicalSections) => {
  const order = normalizeList(reportConfig.sections_order);
  const baseOrder = order.length ? order : canonicalSections;
  const output = [...baseOrder];
  for (const section of canonicalSections) {
    if (!output.includes(section)) {
      output.push(section);
    }
  }
  return output;
};

const resolveSnippets = (
  tokens,
  serviceType,
  contentVersion,
  snippets = [],
  reportConfig = {}
) => {
  const canonicalSections = getCanonicalSections(reportConfig);
  const sectionsOrder = buildSectionsOrder(reportConfig, canonicalSections);
  const totalLimit = resolveTotalLimit(reportConfig);
  const tokenSet = new Set(tokens || []);

  const filtered = snippets.filter(
    (snippet) => tokenSet.has(snippet.key) && matchesServiceScope(snippet.service_scopes, serviceType)
  );

  const ordered = [...filtered].sort((a, b) => {
    const priorityDiff =
      resolveSnippetPriority(b, serviceType, reportConfig) -
      resolveSnippetPriority(a, serviceType, reportConfig);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return (a.key || '').localeCompare(b.key || '');
  });

  const deduped = dedupeSnippets(ordered, reportConfig.dedupe_rules);

  const sections = sectionsOrder.reduce((acc, section) => {
    acc[section] = [];
    return acc;
  }, {});

  let totalCount = 0;
  for (const snippet of deduped) {
    if (totalCount >= totalLimit) {
      break;
    }
    const sectionCandidates = resolveSections(snippet);
    for (const sectionCandidate of sectionCandidates) {
      const normalizedSection = normalizeSection(sectionCandidate, canonicalSections);
      const sectionLimit = resolveSectionLimit(normalizedSection, reportConfig);
      if (sections[normalizedSection].length < sectionLimit) {
        sections[normalizedSection].push(snippet);
        totalCount += 1;
        break;
      }
    }
  }

  return {
    content_version: contentVersion,
    sections
  };
};

module.exports = {
  resolveSnippets,
  VALID_SNIPPET_TYPES,
  VALID_SERVICE_SCOPES
};
