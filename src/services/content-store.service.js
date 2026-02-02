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
const { listPostSummaries, findPostById } = require('../data/content/posts');
const { resolveSnippets } = require('./snippet-resolver.service');
const horoscopeService = require('./horoscope.service');

const CONTENT_PATH = path.join(__dirname, '..', '..', 'data', 'astrolumen_content_v1.json');

const SNIPPET_TYPES = new Set([
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

let cachedContent = null;

const isDev = () => process.env.NODE_ENV !== 'production';

const addError = (errors, path, message) => {
  errors.push({ path, message });
};

const validateArray = (errors, value, path) => {
  if (!Array.isArray(value)) {
    addError(errors, path, 'Expected array.');
    return false;
  }
  return true;
};

const validateRequiredString = (errors, value, path) => {
  if (typeof value !== 'string' || !value.trim()) {
    addError(errors, path, 'Expected non-empty string.');
    return false;
  }
  return true;
};

const validateRequiredNumber = (errors, value, path) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    addError(errors, path, 'Expected number.');
    return false;
  }
  return true;
};

const validateContent = (content) => {
  const errors = [];

  if (!content || typeof content !== 'object') {
    addError(errors, 'root', 'Content must be an object.');
    return errors;
  }

  if (!content.meta || typeof content.meta !== 'object') {
    addError(errors, 'meta', 'Missing meta object.');
  } else {
    validateRequiredString(errors, content.meta.content_version, 'meta.content_version');
    validateRequiredString(errors, content.meta.lang, 'meta.lang');
  }

  if (!content.profile || typeof content.profile !== 'object') {
    addError(errors, 'profile', 'Missing profile object.');
  } else {
    validateRequiredString(errors, content.profile.nome, 'profile.nome');
    validateRequiredString(errors, content.profile.titulo, 'profile.titulo');
    validateRequiredString(errors, content.profile.foto, 'profile.foto');
    validateRequiredString(errors, content.profile.formacao, 'profile.formacao');
    validateRequiredNumber(errors, content.profile.inicio_estudos, 'profile.inicio_estudos');
    validateRequiredString(errors, content.profile.experiencia, 'profile.experiencia');
    validateRequiredString(errors, content.profile.abordagem, 'profile.abordagem');
    validateRequiredString(errors, content.profile.biografia_curta, 'profile.biografia_curta');
    validateRequiredString(errors, content.profile.biografia_longa, 'profile.biografia_longa');
    validateRequiredString(errors, content.profile.missao, 'profile.missao');

    if (!content.profile.citacao || typeof content.profile.citacao !== 'object') {
      addError(errors, 'profile.citacao', 'Missing profile.citacao object.');
    } else {
      validateRequiredString(errors, content.profile.citacao.autor, 'profile.citacao.autor');
      validateRequiredString(errors, content.profile.citacao.texto, 'profile.citacao.texto');
    }

    if (!content.profile.contato || typeof content.profile.contato !== 'object') {
      addError(errors, 'profile.contato', 'Missing profile.contato object.');
    } else {
      validateRequiredString(errors, content.profile.contato.whatsapp, 'profile.contato.whatsapp');
      validateRequiredString(errors, content.profile.contato.instagram, 'profile.contato.instagram');
      validateRequiredString(errors, content.profile.contato.email, 'profile.contato.email');
    }
  }

  if (!content.stats || typeof content.stats !== 'object') {
    addError(errors, 'stats', 'Missing stats object.');
  } else {
    validateRequiredNumber(errors, content.stats.interpretacoes, 'stats.interpretacoes');
    validateRequiredNumber(errors, content.stats.mapas_gerados, 'stats.mapas_gerados');
    validateRequiredNumber(errors, content.stats.avaliacao_media, 'stats.avaliacao_media');
    validateRequiredNumber(errors, content.stats.anos_experiencia, 'stats.anos_experiencia');
    validateRequiredString(errors, content.stats.prazo_medio_entrega, 'stats.prazo_medio_entrega');
  }

  if (validateArray(errors, content.services, 'services')) {
    content.services.forEach((service, index) => {
      const basePath = `services[${index}]`;
      if (!service || typeof service !== 'object') {
        addError(errors, basePath, 'Service must be an object.');
        return;
      }
      validateRequiredString(errors, service.slug, `${basePath}.slug`);
      validateRequiredString(errors, service.nome, `${basePath}.nome`);
      validateRequiredNumber(errors, service.preco, `${basePath}.preco`);
      validateRequiredString(errors, service.prazo_entrega, `${basePath}.prazo_entrega`);
      validateRequiredString(errors, service.resumo, `${basePath}.resumo`);
      validateRequiredString(errors, service.descricao, `${basePath}.descricao`);
      validateRequiredString(errors, service.cta_label, `${basePath}.cta_label`);
      validateRequiredString(errors, service.imagem, `${basePath}.imagem`);
    });
  }

  if (validateArray(errors, content.faq, 'faq')) {
    content.faq.forEach((item, index) => {
      const basePath = `faq[${index}]`;
      if (!item || typeof item !== 'object') {
        addError(errors, basePath, 'FAQ item must be an object.');
        return;
      }
      validateRequiredString(errors, item.q, `${basePath}.q`);
      validateRequiredString(errors, item.a, `${basePath}.a`);
    });
  }

  if (!content.interpretation_library || typeof content.interpretation_library !== 'object') {
    addError(errors, 'interpretation_library', 'Missing interpretation_library object.');
  } else if (validateArray(errors, content.interpretation_library.snippets, 'interpretation_library.snippets')) {
    const seenKeys = new Set();
    const sectionCounts = Object.keys(SECTION_LIMITS).reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});

    content.interpretation_library.snippets.forEach((snippet, index) => {
      const basePath = `interpretation_library.snippets[${index}]`;
      if (!snippet || typeof snippet !== 'object') {
        addError(errors, basePath, 'Snippet must be an object.');
        return;
      }
      validateRequiredString(errors, snippet.type, `${basePath}.type`);
      if (snippet.type && !SNIPPET_TYPES.has(snippet.type)) {
        addError(errors, `${basePath}.type`, `Invalid type '${snippet.type}'.`);
      }
      validateRequiredString(errors, snippet.key, `${basePath}.key`);
      if (snippet.key) {
        if (seenKeys.has(snippet.key)) {
          addError(errors, `${basePath}.key`, `Duplicate key '${snippet.key}'.`);
        }
        seenKeys.add(snippet.key);
      }
      validateRequiredString(errors, snippet.title, `${basePath}.title`);
      validateRequiredString(errors, snippet.text_md, `${basePath}.text_md`);

      const section = snippet.section || resolveSectionByTags(snippet.tags || []);
      if (!SECTION_LIMITS[section]) {
        addError(errors, `${basePath}.section`, `Invalid section '${section}'.`);
      } else {
        sectionCounts[section] += 1;
        if (sectionCounts[section] > SECTION_LIMITS[section]) {
          addError(
            errors,
            `${basePath}.section`,
            `Section '${section}' exceeds limit ${SECTION_LIMITS[section]}.`
          );
        }
      }
    });
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
  const raw = fs.readFileSync(CONTENT_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  const errors = validateContent(parsed);

  if (errors.length > 0) {
    console.error('Invalid content JSON:', {
      path: CONTENT_PATH,
      errors
    });

    if (isDev()) {
      throw new Error(`Invalid content JSON: ${errors.map((error) => `${error.path}: ${error.message}`).join(' | ')}`);
    }
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
const getProfile = () => loadContent().profile || {};
const getStats = () => loadContent().stats || {};
const getServices = () => loadContent().services || [];
const getService = (slug) => (loadContent().services || []).find((service) => service.slug === slug);
const getFAQ = () => loadContent().faq || [];

const getPosts = () => {
  const content = loadContent();
  if (Array.isArray(content.posts)) {
    return content.posts;
  }
  return listPostSummaries();
};

const getPost = (id) => {
  const content = loadContent();
  if (Array.isArray(content.posts)) {
    return content.posts.find((post) => post.id === Number(id));
  }
  return findPostById(id);
};

const getHoroscope = (sign) => {
  const content = loadContent();
  const key = (sign || '').toLowerCase();
  const daily = content.horoscope && content.horoscope.daily;

  if (daily && typeof daily === 'object' && daily[key]) {
    return {
      sign: key,
      texto: daily[key],
      data: new Date().toISOString().split('T')[0]
    };
  }

  return horoscopeService.getDailyHoroscope(sign);
};

const getSnippetsByKeys = (keys = [], serviceType = 'natal') => {
  const content = loadContent();
  const snippets = content.interpretation_library?.snippets || [];
  const contentVersion = content.meta?.content_version || 'v1';

  return resolveSnippets(keys, serviceType, contentVersion, snippets);
};

module.exports = {
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
