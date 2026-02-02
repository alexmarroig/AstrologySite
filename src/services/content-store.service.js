const fs = require('fs');
const path = require('path');

const { listPostSummaries, findPostById } = require('../data/content/posts');
const { resolveSnippets } = require('./snippet-resolver.service');
const horoscopeService = require('./horoscope.service');

const CONTENT_DIR = path.join(__dirname, '..', '..', 'data');
const DEFAULT_CONTENT_VERSION = 'v1';

const SNIPPET_TYPES = new Set([
  'planet_sign_house',
  'aspect_house',
  'planet_sign',
  'planet_house',
  'aspect'
]);

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

const resolveSnippetSection = (snippet = {}) => {
  if (snippet.section) {
    return snippet.section;
  }
  if (Array.isArray(snippet.sections) && snippet.sections.length) {
    return snippet.sections[0];
  }
  return resolveSectionByTags(Array.isArray(snippet.tags) ? snippet.tags : []);
};

const isDev = () => process.env.NODE_ENV !== 'production';

const addError = (errors, pathKey, message) => {
  errors.push({ path: pathKey, message });
};

const validateArray = (errors, value, pathKey) => {
  if (!Array.isArray(value)) {
    addError(errors, pathKey, 'Expected array.');
    return false;
  }
  return true;
};

const validateRequiredString = (errors, value, pathKey) => {
  if (typeof value !== 'string' || !value.trim()) {
    addError(errors, pathKey, 'Expected non-empty string.');
    return false;
  }
  return true;
};

const validateRequiredNumber = (errors, value, pathKey) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    addError(errors, pathKey, 'Expected number.');
    return false;
  }
  return true;
};

const validateOptionalStringArray = (errors, value, pathKey) => {
  if (value === undefined) {
    return;
  }
  if (!validateArray(errors, value, pathKey)) {
    return;
  }
  value.forEach((entry, index) => {
    if (typeof entry !== 'string') {
      addError(errors, `${pathKey}[${index}]`, 'Expected string.');
    }
  });
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
      validateOptionalStringArray(errors, service.para_quem_e, `${basePath}.para_quem_e`);
      validateOptionalStringArray(errors, service.inclui, `${basePath}.inclui`);
      validateOptionalStringArray(errors, service.como_funciona, `${basePath}.como_funciona`);
      validateOptionalStringArray(errors, service.beneficios, `${basePath}.beneficios`);
      validateOptionalStringArray(errors, service.tags, `${basePath}.tags`);
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
      if (snippet.priority !== undefined) {
        validateRequiredNumber(errors, snippet.priority, `${basePath}.priority`);
      }
      validateOptionalStringArray(errors, snippet.service_scopes, `${basePath}.service_scopes`);
      validateOptionalStringArray(errors, snippet.tags, `${basePath}.tags`);

      const section = resolveSnippetSection(snippet);
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

const contentCache = new Map();

const getContentPath = (version = DEFAULT_CONTENT_VERSION) =>
  path.join(CONTENT_DIR, `astrolumen_content_${version}.json`);

const loadContent = (version = DEFAULT_CONTENT_VERSION) => {
  if (contentCache.has(version)) {
    return contentCache.get(version);
  }

  const contentPath = getContentPath(version);
  const raw = fs.readFileSync(contentPath, 'utf-8');
  const parsed = JSON.parse(raw);
  const errors = validateContent(parsed);

  if (errors.length > 0) {
    console.error('[content-store] Invalid content JSON:', {
      path: contentPath,
      errors
    });

    if (isDev()) {
      throw new Error(
        `Invalid content JSON: ${errors
          .map((error) => `${error.path}: ${error.message}`)
          .join(' | ')}`
      );
    }
  }

  contentCache.set(version, parsed);
  return parsed;
};

const writeContent = (content, version = DEFAULT_CONTENT_VERSION) => {
  const contentPath = getContentPath(version);
  fs.writeFileSync(contentPath, `${JSON.stringify(content, null, 2)}\n`, 'utf-8');
  contentCache.set(version, content);
  return contentPath;
};

const initializeContentStore = () => loadContent();

const getContent = (version = DEFAULT_CONTENT_VERSION) => loadContent(version);
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

const getSnippets = (version = DEFAULT_CONTENT_VERSION) =>
  loadContent(version).interpretation_library?.snippets || [];

const getSnippetsByKeys = (keys = [], serviceType = 'natal') => {
  const content = loadContent();
  const snippets = content.interpretation_library?.snippets || [];
  const contentVersion = content.meta?.content_version || DEFAULT_CONTENT_VERSION;

  return resolveSnippets(keys, serviceType, contentVersion, snippets);
};

module.exports = {
  initializeContentStore,
  getContent,
  getContentPath,
  writeContent,
  validateContent,
  resolveSectionByTags,
  resolveSnippetSection,
  getProfile,
  getStats,
  getServices,
  getService,
  getFAQ,
  getPosts,
  getPost,
  getHoroscope,
  getSnippets,
  getSnippetsByKeys
};
