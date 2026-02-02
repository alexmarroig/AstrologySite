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

const resolveSectionByTags = (tags = []) => {
  for (const [section, keywords] of Object.entries(SECTION_BY_TAG)) {
    if (tags.some((tag) => keywords.includes(tag))) {
      return section;
    }
  }
  return 'resumo';
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
    const snippetSections = resolveSections(snippet);
    for (const section of snippetSections) {
      if (!sections[section]) {
        continue;
      }
      if (sections[section].length < SECTION_LIMITS[section]) {
        sections[section].push(snippet);
      }
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
