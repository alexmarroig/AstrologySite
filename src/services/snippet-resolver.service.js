const SECTION_LIMITS = {
  resumo: 3,
  identidade: 6,
  relacoes: 6,
  carreira: 6,
  ciclos: 6
};

const SECTION_BY_TAG = {
  identidade: ['identidade'],
  relacoes: ['relacionamentos', 'relacoes', 'amor'],
  carreira: ['carreira', 'profissao'],
  ciclos: ['ciclos', 'timing', 'transitos']
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

const resolveSectionByTags = (tags = []) => {
  for (const [section, keywords] of Object.entries(SECTION_BY_TAG)) {
    if (tags.some((tag) => keywords.includes(tag))) {
      return section;
    }
  }
  return 'resumo';
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
  validateSnippets(snippets);
  const filtered = snippets.filter(
    (snippet) =>
      tokens.includes(snippet.key) &&
      (!snippet.service_scopes || snippet.service_scopes.includes(serviceType))
  );

  const ordered = filtered.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const deduped = dedupeSnippets(ordered);

  const sections = {
    resumo: [],
    identidade: [],
    relacoes: [],
    carreira: [],
    ciclos: []
  };

  for (const snippet of deduped) {
    const section = resolveSectionByTags(snippet.tags || []);
    if (sections[section].length < SECTION_LIMITS[section]) {
      sections[section].push(snippet);
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
