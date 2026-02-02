const fs = require('fs');
const path = require('path');

const CONTENT_PATH = path.join(__dirname, '..', '..', 'data', 'astrolumen_content_v1.json');
const VALID_TOP_LEVEL_SECTIONS = new Set([
  'meta',
  'profile',
  'stats',
  'services',
  'faq',
  'interpretation_library',
  'posts',
  'horoscope'
]);
const REQUIRED_TOP_LEVEL_SECTIONS = ['meta', 'profile', 'stats', 'services', 'faq', 'interpretation_library'];
const VALID_SNIPPET_TYPES = new Set([
  'planet_sign_house',
  'aspect_house',
  'planet_sign',
  'planet_house',
  'aspect'
]);

let cachedContent = null;

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const addError = (errors, message) => {
  errors.push(message);
};

const assertRequiredFields = (errors, data, fields, scope) => {
  if (!isPlainObject(data)) {
    addError(errors, `${scope} deve ser um objeto.`);
    return;
  }
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null) {
      addError(errors, `${scope}.${field} é obrigatório.`);
    }
  }
};

const assertArray = (errors, value, scope) => {
  if (!Array.isArray(value)) {
    addError(errors, `${scope} deve ser um array.`);
    return false;
  }
  return true;
};

const assertStringArray = (errors, value, scope) => {
  if (!assertArray(errors, value, scope)) {
    return;
  }
  value.forEach((entry, index) => {
    if (typeof entry !== 'string') {
      addError(errors, `${scope}[${index}] deve ser uma string.`);
    }
  });
};

const validateServices = (errors, services) => {
  if (!assertArray(errors, services, 'services')) {
    return;
  }

  services.forEach((service, index) => {
    const scope = `services[${index}]`;
    assertRequiredFields(
      errors,
      service,
      [
        'slug',
        'nome',
        'preco',
        'prazo_entrega',
        'resumo',
        'descricao',
        'para_quem_e',
        'inclui',
        'como_funciona',
        'beneficios',
        'faq',
        'cta_label',
        'imagem',
        'tags'
      ],
      scope
    );

    if (service && service.para_quem_e) {
      assertStringArray(errors, service.para_quem_e, `${scope}.para_quem_e`);
    }
    if (service && service.inclui) {
      assertStringArray(errors, service.inclui, `${scope}.inclui`);
    }
    if (service && service.como_funciona) {
      assertStringArray(errors, service.como_funciona, `${scope}.como_funciona`);
    }
    if (service && service.beneficios) {
      assertStringArray(errors, service.beneficios, `${scope}.beneficios`);
    }
    if (service && service.tags) {
      assertStringArray(errors, service.tags, `${scope}.tags`);
    }
    if (service && service.faq) {
      if (assertArray(errors, service.faq, `${scope}.faq`)) {
        service.faq.forEach((entry, faqIndex) => {
          assertRequiredFields(errors, entry, ['q', 'a'], `${scope}.faq[${faqIndex}]`);
        });
      }
    }
  });
};

const validateFaq = (errors, faq) => {
  if (!assertArray(errors, faq, 'faq')) {
    return;
  }
  faq.forEach((entry, index) => {
    assertRequiredFields(errors, entry, ['q', 'a'], `faq[${index}]`);
  });
};

const validatePosts = (errors, posts) => {
  if (!posts) {
    return;
  }
  if (!assertArray(errors, posts, 'posts')) {
    return;
  }
  posts.forEach((post, index) => {
    assertRequiredFields(
      errors,
      post,
      ['id', 'titulo', 'resumo', 'conteudo', 'autor', 'data_publicacao', 'imagem'],
      `posts[${index}]`
    );
  });
};

const validateHoroscope = (errors, horoscope) => {
  if (horoscope === undefined) {
    return;
  }
  if (!isPlainObject(horoscope)) {
    addError(errors, 'horoscope deve ser um objeto.');
  }
};

const validateSnippets = (errors, interpretationLibrary) => {
  if (!isPlainObject(interpretationLibrary)) {
    addError(errors, 'interpretation_library deve ser um objeto.');
    return;
  }

  const snippets = interpretationLibrary.snippets;
  if (!assertArray(errors, snippets, 'interpretation_library.snippets')) {
    return;
  }

  const seenKeys = new Set();
  snippets.forEach((snippet, index) => {
    const scope = `interpretation_library.snippets[${index}]`;
    assertRequiredFields(
      errors,
      snippet,
      ['type', 'key', 'title', 'text_md', 'priority', 'service_scopes', 'tags'],
      scope
    );

    if (snippet && snippet.type && !VALID_SNIPPET_TYPES.has(snippet.type)) {
      addError(errors, `${scope}.type inválido (${snippet.type}).`);
    }

    if (snippet && snippet.key) {
      if (seenKeys.has(snippet.key)) {
        addError(errors, `${scope}.key duplicado (${snippet.key}).`);
      }
      seenKeys.add(snippet.key);
    }

    if (snippet && snippet.service_scopes) {
      assertStringArray(errors, snippet.service_scopes, `${scope}.service_scopes`);
    }
    if (snippet && snippet.tags) {
      assertStringArray(errors, snippet.tags, `${scope}.tags`);
    }
  });
};

const validateSchema = (content) => {
  const errors = [];

  if (!isPlainObject(content)) {
    addError(errors, 'Conteúdo deve ser um objeto JSON válido.');
    return errors;
  }

  Object.keys(content).forEach((section) => {
    if (!VALID_TOP_LEVEL_SECTIONS.has(section)) {
      addError(errors, `Seção inválida no conteúdo: ${section}.`);
    }
  });

  REQUIRED_TOP_LEVEL_SECTIONS.forEach((section) => {
    if (content[section] === undefined) {
      addError(errors, `Seção obrigatória ausente: ${section}.`);
    }
  });

  if (content.meta) {
    assertRequiredFields(
      errors,
      content.meta,
      ['content_version', 'lang', 'last_updated'],
      'meta'
    );
  }

  if (content.profile) {
    assertRequiredFields(
      errors,
      content.profile,
      [
        'nome',
        'titulo',
        'foto',
        'formacao',
        'inicio_estudos',
        'experiencia',
        'abordagem',
        'biografia_curta',
        'biografia_longa',
        'missao',
        'citacao',
        'contato'
      ],
      'profile'
    );

    if (content.profile && content.profile.citacao) {
      assertRequiredFields(errors, content.profile.citacao, ['autor', 'texto'], 'profile.citacao');
    }
    if (content.profile && content.profile.contato) {
      assertRequiredFields(
        errors,
        content.profile.contato,
        ['whatsapp', 'instagram', 'email'],
        'profile.contato'
      );
    }
  }

  if (content.stats) {
    assertRequiredFields(
      errors,
      content.stats,
      ['interpretacoes', 'mapas_gerados', 'avaliacao_media', 'anos_experiencia', 'prazo_medio_entrega'],
      'stats'
    );
  }

  if (content.services) {
    validateServices(errors, content.services);
  }

  if (content.faq) {
    validateFaq(errors, content.faq);
  }

  validatePosts(errors, content.posts);
  validateHoroscope(errors, content.horoscope);

  if (content.interpretation_library) {
    validateSnippets(errors, content.interpretation_library);
  }

  return errors;
};

const loadContent = () => {
  if (cachedContent) {
    return cachedContent;
  }

  let parsed;
  try {
    const raw = fs.readFileSync(CONTENT_PATH, 'utf-8');
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error('[content-store] Falha ao carregar JSON de conteúdo:', error);
    throw error;
  }

  const errors = validateSchema(parsed);
  if (errors.length) {
    console.error('[content-store] Falha na validação do schema.');
    errors.forEach((message) => {
      console.error(`- ${message}`);
    });
    const error = new Error(
      `Falha na validação do conteúdo (${errors.length} problema(s)).`
    );
    error.details = errors;
    throw error;
  }

  cachedContent = parsed;
  return cachedContent;
};

const initializeContentStore = () => loadContent();

const getProfile = () => loadContent().profile || {};
const getStats = () => loadContent().stats || {};
const getServices = () => loadContent().services || [];
const getService = (slug) => getServices().find((service) => service.slug === slug);
const getFAQ = () => loadContent().faq || [];
const getPosts = () => loadContent().posts || [];
const getPost = (idOrSlug) => {
  const posts = getPosts();
  const numericId = Number(idOrSlug);
  return posts.find((post) => post.id === numericId || post.slug === idOrSlug);
};
const getHoroscope = () => loadContent().horoscope || {};
const getSnippetsByKeys = (keys = []) => {
  const snippets = loadContent().interpretation_library?.snippets || [];
  const keySet = new Set(keys);
  return snippets.filter((snippet) => keySet.has(snippet.key));
};

module.exports = {
  initializeContentStore,
  getProfile,
  getStats,
  getServices,
  getService,
  getFAQ,
  getPosts,
  getPost,
  getHoroscope,
  getSnippetsByKeys
};
