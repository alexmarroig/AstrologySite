const SECTION_BY_TAG = {
  identidade: ['identidade'],
  relacoes: ['relacionamentos', 'relacoes', 'amor'],
  carreira: ['carreira', 'profissao'],
  ciclos: ['ciclos', 'timing', 'transitos']
};

const DEFAULT_CANONICAL_SECTIONS = ['resumo', 'identidade', 'relacoes', 'carreira', 'ciclos'];
const DEFAULT_SECTIONS_ORDER = [...DEFAULT_CANONICAL_SECTIONS];
const DEFAULT_SERVICE_PRIORITIES = {
  natal: 5,
  solar_return: 4,
  synastry: 3,
  predictions: 2,
  progressions: 1
};
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
const MAX_SUMMARY_LIMIT = 2;
const MAX_SECTION_LIMIT = 6;
const MAX_TOTAL_LIMIT = 42;

const resolveSectionByTags = (tags = []) => {
  for (const [section, keywords] of Object.entries(SECTION_BY_TAG)) {
    if (tags.some((tag) => keywords.includes(tag))) {
      return section;
    }
  }
  return 'resumo';
};

const normalizeSections = (sections) =>
  Array.isArray(sections) ? sections.filter(Boolean) : [];

const buildSectionsOrder = (reportConfig = {}, canonicalSections) => {
  const order = normalizeSections(reportConfig.sections_order);
  const baseOrder = order.length ? order : DEFAULT_SECTIONS_ORDER;
  const output = [...baseOrder];
  for (const section of canonicalSections) {
    if (!output.includes(section)) {
      output.push(section);
    }
  }
  return output;
};

const getCanonicalSections = (reportConfig = {}) => {
  const canonical =
    reportConfig.canonical_sections ||
    reportConfig.sections_canonical ||
    reportConfig.required_sections;
  const normalized = normalizeSections(canonical);
  return normalized.length ? normalized : DEFAULT_CANONICAL_SECTIONS;
};

const getAllowedSections = (reportConfig = {}, serviceType, canonicalSections) => {
  const sectionsByService =
    reportConfig.sections_by_service ||
    reportConfig.service_sections ||
    reportConfig.allowed_sections;
  if (sectionsByService && serviceType && Array.isArray(sectionsByService[serviceType])) {
    return normalizeSections(sectionsByService[serviceType]);
  }
  return canonicalSections;
};

const resolveSectionLimit = (section, reportConfig = {}) => {
  const sectionLimits = reportConfig.section_limits || {};
  const configuredLimit = sectionLimits[section];
  const defaultLimit = section === 'resumo' ? MAX_SUMMARY_LIMIT : MAX_SECTION_LIMIT;
  const resolved =
    typeof configuredLimit === 'number' && Number.isFinite(configuredLimit)
      ? configuredLimit
      : defaultLimit;
  return Math.min(resolved, defaultLimit);
};

const resolveTotalLimit = (reportConfig = {}) => {
  const configured = reportConfig.total_limit;
  if (typeof configured === 'number' && Number.isFinite(configured)) {
    return Math.min(configured, MAX_TOTAL_LIMIT);
  }
  return MAX_TOTAL_LIMIT;
};

const resolveServicePriority = (serviceType, reportConfig = {}) => {
  const priorities = reportConfig.service_priorities || DEFAULT_SERVICE_PRIORITIES;
  return priorities?.[serviceType] ?? 0;
};

const resolveSnippetPriority = (snippet, serviceType, reportConfig = {}) => {
  const basePriority = snippet.priority || 0;
  const perServicePriority =
    (snippet.service_priorities && snippet.service_priorities[serviceType]) || 0;
  const servicePriority = resolveServicePriority(serviceType, reportConfig);
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

const normalizeSection = (section, allowedSections) => {
  if (allowedSections.includes(section)) {
    return section;
  }
  if (allowedSections.includes('resumo')) {
    return 'resumo';
  }
  return allowedSections[0];
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
  const allowedSections = getAllowedSections(reportConfig, serviceType, canonicalSections);
  const totalLimit = resolveTotalLimit(reportConfig);
  const filtered = snippets.filter(
    (snippet) =>
      tokens.includes(snippet.key) &&
      (!snippet.service_scopes || snippet.service_scopes.includes(serviceType))
  );

  const ordered = filtered.sort((a, b) => {
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
    if (!acc[section]) {
      acc[section] = [];
    }
    return acc;
  }, {});

  let totalCount = 0;

  for (const snippet of deduped) {
    if (totalCount >= totalLimit) {
      break;
    }
    const resolvedSection = snippet.section || resolveSectionByTags(snippet.tags || []);
    const normalizedSection = normalizeSection(resolvedSection, allowedSections);
    if (!sections[normalizedSection]) {
      sections[normalizedSection] = [];
    }
    const sectionLimit = resolveSectionLimit(normalizedSection, reportConfig);
    if (sections[normalizedSection].length < sectionLimit) {
      sections[normalizedSection].push(snippet);
      totalCount += 1;
    }
  }

  return {
    content_version: contentVersion,
    sections
  };
};

module.exports = {
  resolveSnippets
};
