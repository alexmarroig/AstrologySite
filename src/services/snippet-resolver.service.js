const TOTAL_SNIPPET_LIMIT = 42;
const SUMMARY_LIMIT = 2;
const DEFAULT_SECTION_LIMIT = 6;

const SECTION_LIMITS = {
  summary: SUMMARY_LIMIT,
  core_identity: DEFAULT_SECTION_LIMIT,
  emotional: DEFAULT_SECTION_LIMIT,
  relational: DEFAULT_SECTION_LIMIT,
  vocation: DEFAULT_SECTION_LIMIT,
  cycles: DEFAULT_SECTION_LIMIT
};

const SECTION_BY_TAG = {
  summary: ['summary', 'resumo', 'sintese', 'overview'],
  core_identity: [
    'core_identity',
    'identidade',
    'essencia',
    'personalidade',
    'autoconhecimento',
    'transformacao'
  ],
  emotional: ['emotional', 'emocional', 'emocao', 'sentimentos', 'afetivo', 'lua'],
  relational: [
    'relational',
    'relacionamentos',
    'relacoes',
    'amor',
    'parcerias',
    'compatibilidade',
    'sinastria'
  ],
  vocation: [
    'vocation',
    'carreira',
    'profissao',
    'vocacao',
    'trabalho',
    'proposito',
    'financas'
  ],
  cycles: [
    'cycles',
    'ciclos',
    'timing',
    'transitos',
    'progressao',
    'progressoes',
    'ano',
    'planejamento'
  ]
};

const PLANETS = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto'
];

const SLOW_PLANETS = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const PERSONAL_PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars'];
const ANGLES = ['asc', 'ascendant', 'rising', 'mc', 'midheaven', 'ic', 'dc', 'desc', 'descendant'];

const SERVICE_TYPES = {
  natal: new Set(['natal', 'natal_chart', 'natal-chart', 'mapa-natal']),
  solar_return: new Set(['solar_return', 'solar-return', 'revolucao-solar']),
  synastry: new Set(['synastry', 'sinastria']),
  predictions: new Set(['predictions', 'transitos', 'transit']),
  progressions: new Set(['progressions', 'progressoes', 'progressao'])
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
  const normalizedTags = normalizeList(tags);
  for (const [section, keywords] of Object.entries(SECTION_BY_TAG)) {
    if (normalizedTags.some((tag) => keywords.includes(tag))) {
      return section;
    }
  }
  return 'summary';
};

const resolveSections = (snippet) => {
  if (Array.isArray(snippet.sections) && snippet.sections.length > 0) {
    return snippet.sections;
  }
  return [resolveSectionByTags(snippet.tags || [])];
};

const dedupeSnippets = (snippets) => {
  const hasPlanetSignHouse = new Set();
  const hasAspectHouse = new Set();
const normalizeList = (list = []) =>
  list.map((item) => (typeof item === 'string' ? item.toLowerCase() : item)).filter(Boolean);

const extractTokens = (snippetKey = '') => normalizeList(snippetKey.split('_'));

const extractPlanets = (snippetKey = '') => {
  const tokens = extractTokens(snippetKey);
  return tokens.filter((token) => PLANETS.includes(token));
};

const hasAngle = (snippetKey = '') => {
  const tokens = extractTokens(snippetKey);
  return tokens.some((token) => ANGLES.includes(token));
};

const hasOverlay = (snippet = {}) => {
  const tags = normalizeList(snippet.tags || []);
  return (
    tags.includes('overlay') ||
    tags.includes('syn_overlay') ||
    tags.includes('sinastria') ||
    snippet.key?.includes('overlay') ||
    snippet.type?.includes('overlay')
  );
};

const resolveServiceBucket = (serviceType = '') => {
  const normalized = serviceType.toLowerCase();
  for (const [bucket, aliases] of Object.entries(SERVICE_TYPES)) {
    if (aliases.has(normalized)) {
      return bucket;
    }
  }
  return normalized || 'default';
};

const matchesServiceScope = (serviceScopes = [], serviceType = '') => {
  if (!serviceScopes || serviceScopes.length === 0) {
    return true;
  }
  const normalizedServiceType = serviceType.toLowerCase();
  const bucket = resolveServiceBucket(serviceType);
  return normalizeList(serviceScopes).some((scope) => {
    if (!scope) {
      return false;
    }
    return scope === normalizedServiceType || resolveServiceBucket(scope) === bucket;
  });
};

const buildPriorityScore = (snippet, serviceType) => {
  const basePriority = snippet.priority || 0;
  const bucket = resolveServiceBucket(serviceType);
  const tags = normalizeList(snippet.tags || []);
  const planets = extractPlanets(snippet.key || '');
  const hasSun = planets.includes('sun');
  const hasMoon = planets.includes('moon');
  const hasPersonalPlanet = planets.some((planet) => PERSONAL_PLANETS.includes(planet));
  const hasSlowPlanet = planets.some((planet) => SLOW_PLANETS.includes(planet));
  const includesAngle = hasAngle(snippet.key || '');

  let boost = 0;

  if (bucket === 'natal' || bucket === 'solar_return') {
    if (hasSun) boost += 30;
    if (hasMoon) boost += 25;
    if (includesAngle) boost += 20;
    if (hasPersonalPlanet) boost += 10;
  }

  if (bucket === 'predictions' || bucket === 'progressions') {
    if (hasSlowPlanet) boost += 25;
    if (tags.some((tag) => SECTION_BY_TAG.cycles.includes(tag))) boost += 10;
  }

  if (bucket === 'synastry') {
    if (hasOverlay(snippet)) boost += 30;
    if (hasPersonalPlanet) boost += 20;
    if (includesAngle) boost += 15;
  }

  return basePriority + boost;
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
      tokens.includes(snippet.key) && matchesServiceScope(snippet.service_scopes, serviceType)
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
  const ordered = filtered
    .map((snippet, index) => ({
      snippet,
      index,
      score: buildPriorityScore(snippet, serviceType)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.snippet);

  const deduped = dedupeSnippets(ordered);

  const sections = {
    summary: [],
    core_identity: [],
    emotional: [],
    relational: [],
    vocation: [],
    cycles: []
  };

  let totalCount = 0;

  for (const snippet of deduped) {
    const snippetSections = resolveSections(snippet);
    for (const section of snippetSections) {
      if (!sections[section]) {
        continue;
      }
      if (sections[section].length < SECTION_LIMITS[section]) {
        sections[section].push(snippet);
      }
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
    if (totalCount >= TOTAL_SNIPPET_LIMIT) {
      break;
    }
    const section = resolveSectionByTags(snippet.tags || []);
    if (sections[section].length < SECTION_LIMITS[section]) {
      sections[section].push(snippet);
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
