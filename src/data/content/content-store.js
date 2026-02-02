const fs = require('fs');
const path = require('path');

const CONTENT_PATH = path.join(__dirname, '..', '..', '..', 'data', 'astrolumen_content_v1.json');
const CANONICAL_SECTIONS = ['resumo', 'identidade', 'relacoes', 'carreira', 'ciclos'];
const ALLOWED_SNIPPET_TYPES = new Set([
  'planet_sign_house',
  'aspect_house',
  'planet_sign',
  'planet_house',
  'aspect'
]);
const SERVICE_SECTION_COMPATIBILITY = {
  natal: CANONICAL_SECTIONS,
  predictions: ['resumo', 'carreira', 'ciclos'],
  progressions: ['resumo', 'identidade', 'ciclos']
};

let cachedContent = null;

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`contentStore: ${message}`);
  }
};

const validateServices = (services) => {
  assert(Array.isArray(services), 'services deve ser uma lista.');
  const slugs = new Set();
  const keys = new Set();

  services.forEach((service, index) => {
    assert(service && typeof service === 'object', `services[${index}] deve ser um objeto.`);
    assert(typeof service.slug === 'string' && service.slug.trim(), `services[${index}].slug é obrigatório.`);

    if (slugs.has(service.slug)) {
      throw new Error(`contentStore: services possui slug duplicado: ${service.slug}`);
    }
    slugs.add(service.slug);

    if (service.key !== undefined && service.key !== null) {
      assert(
        typeof service.key === 'string' && service.key.trim(),
        `services[${index}].key deve ser uma string válida.`
      );
      if (keys.has(service.key)) {
        throw new Error(`contentStore: services possui key duplicado: ${service.key}`);
      }
      keys.add(service.key);
    }
  });
};

const validateSnippets = (snippets) => {
  assert(Array.isArray(snippets), 'interpretation_library.snippets deve ser uma lista.');
  const canonicalSet = new Set(CANONICAL_SECTIONS);

  snippets.forEach((snippet, index) => {
    assert(snippet && typeof snippet === 'object', `snippets[${index}] deve ser um objeto.`);
    assert(ALLOWED_SNIPPET_TYPES.has(snippet.type), `snippets[${index}].type inválido.`);
    assert(typeof snippet.key === 'string' && snippet.key.trim(), `snippets[${index}].key é obrigatório.`);
    assert(typeof snippet.title === 'string' && snippet.title.trim(), `snippets[${index}].title é obrigatório.`);
    assert(typeof snippet.text_md === 'string' && snippet.text_md.trim(), `snippets[${index}].text_md é obrigatório.`);
    assert(typeof snippet.priority === 'number', `snippets[${index}].priority é obrigatório.`);
    assert(
      Array.isArray(snippet.service_scopes) && snippet.service_scopes.length > 0,
      `snippets[${index}].service_scopes é obrigatório.`
    );
    assert(
      Array.isArray(snippet.sections) && snippet.sections.length > 0,
      `snippets[${index}].sections é obrigatório.`
    );

    snippet.sections.forEach((section) => {
      assert(canonicalSet.has(section), `snippets[${index}].sections contém seção inválida: ${section}`);
    });

    snippet.service_scopes.forEach((scope) => {
      const allowedSections = SERVICE_SECTION_COMPATIBILITY[scope];
      assert(allowedSections, `snippets[${index}].service_scopes contém serviço inválido: ${scope}`);
      const allowedSet = new Set(allowedSections);
      snippet.sections.forEach((section) => {
        assert(
          allowedSet.has(section),
          `snippets[${index}].sections contém seção incompatível com ${scope}: ${section}`
        );
      });
    });
  });
};

const validateContent = (content) => {
  assert(content && typeof content === 'object', 'conteúdo inválido.');
  validateServices(content.services || []);
  validateSnippets(content.interpretation_library?.snippets || []);
};

const getContent = () => {
  if (cachedContent) {
    return cachedContent;
  }

  const raw = fs.readFileSync(CONTENT_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  validateContent(parsed);
  cachedContent = parsed;
  return parsed;
};

module.exports = {
  CANONICAL_SECTIONS,
  getContent
};
