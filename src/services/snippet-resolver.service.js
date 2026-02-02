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

const resolveSectionByTags = (tags = []) => {
  const normalizedTags = normalizeList(tags);
  for (const [section, keywords] of Object.entries(SECTION_BY_TAG)) {
    if (normalizedTags.some((tag) => keywords.includes(tag))) {
      return section;
    }
  }
  return 'summary';
};

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

const dedupeSnippets = (snippets) => {
  const hasPlanetSignHouse = new Set();
  const hasAspectHouse = new Set();

  for (const snippet of snippets) {
    if (snippet.type === 'planet_sign_house') {
      hasPlanetSignHouse.add(snippet.key);
    }
    if (snippet.type === 'aspect_house') {
      hasAspectHouse.add(snippet.key);
    }
  }

  return snippets.filter((snippet) => {
    if (snippet.type === 'planet_sign' || snippet.type === 'planet_house') {
      const [planet] = snippet.key.split('_');
      return !Array.from(hasPlanetSignHouse).some((key) => key.startsWith(`${planet}_`));
    }
    if (snippet.type === 'aspect') {
      const normalized = snippet.key.replace('aspect_', '');
      return !Array.from(hasAspectHouse).some((key) => key.includes(normalized));
    }
    return true;
  });
};

const resolveSnippets = (tokens, serviceType, contentVersion, snippets = []) => {
  const filtered = snippets.filter(
    (snippet) =>
      tokens.includes(snippet.key) && matchesServiceScope(snippet.service_scopes, serviceType)
  );

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
