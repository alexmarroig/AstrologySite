const fs = require('fs');
const path = require('path');
const {
  validateContent,
  REQUIRED_WHATSAPP,
  CANONICAL_SECTIONS,
  ALLOWED_SNIPPET_TYPES
} = require('./validateContent');
const { validateContent } = require('./validateContent');

const CONTENT_PATH = path.join(__dirname, '..', '..', 'data', 'astrolumen_content_v1.json');

let cachedContent = null;
let validationErrors = [];

const loadContent = () => {
  const raw = fs.readFileSync(CONTENT_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  validationErrors = validateContent(parsed);

  if (validationErrors.length > 0) {
    const message = `Conteúdo inválido: ${validationErrors.join(', ')}`;
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(message);
    }
    console.error(message);
    cachedContent = null;
    return null;
  }

  cachedContent = parsed;
  return parsed;
};

const ensureContent = () => {
  if (!cachedContent) {
    return loadContent();
  }
  return cachedContent;
};

const getContentOrThrow = () => {
  const content = ensureContent();
  if (!content) {
    throw new Error('Conteúdo inválido: falha na validação');
  }
  return content;
let cachedError = null;

const isDev = () => process.env.NODE_ENV !== 'production';

const logCritical = (message, error) => {
  console.error(`[contentStore] CRITICAL: ${message}`);
  if (error?.details) {
    error.details.forEach((detail) => {
      console.error(`- ${detail.path}: ${detail.message}`);
    });
  } else if (error) {
    console.error(error);
  }
};

const loadContent = () => {
  if (cachedContent) {
    return cachedContent;
  }

  if (cachedError) {
    return null;
  }

  let parsed;
  try {
    const raw = fs.readFileSync(CONTENT_PATH, 'utf-8');
    parsed = JSON.parse(raw);
  } catch (error) {
    if (isDev()) {
      throw error;
    }
    cachedError = error;
    logCritical('Falha ao carregar JSON de conteúdo.', error);
    return null;
  }

  const errors = validateContent(parsed);
  if (errors.length > 0) {
    const error = new Error(`Falha na validação do conteúdo (${errors.length} problema(s)).`);
    error.details = errors;

    if (isDev()) {
      throw error;
    }

    cachedError = error;
    logCritical('Conteúdo inválido.', error);
    return null;
  }

  cachedContent = parsed;
  return cachedContent;
};

const requireContent = () => {
  const content = loadContent();
  if (cachedError) {
    throw cachedError;
  }
  return content || {};
};

const initializeContentStore = () => {
  loadContent();
};

const getProfile = () => getContentOrThrow().profile;
const getStats = () => getContentOrThrow().stats;
const getServices = () => getContentOrThrow().services || [];
const getService = (slug) => (getContentOrThrow().services || []).find((svc) => svc.slug === slug);
const getFAQ = () => getContentOrThrow().faq || [];
const getPosts = () => getContentOrThrow().posts || [];
const getPost = (id) =>
  (getContentOrThrow().posts || []).find((post) => String(post.id) === String(id));
const getHoroscopeDaily = (sign) => getContentOrThrow().horoscope?.daily?.[sign];
const getSnippetsByKeys = (keys = []) => {
  const snippets = getContentOrThrow().interpretation_library?.snippets || [];
  const keySet = new Set(keys);
  return snippets.filter((snippet) => keySet.has(snippet.key));
};
const getAllSnippets = () => getContentOrThrow().interpretation_library?.snippets || [];
const getReportConfig = () => getContentOrThrow().report_config || {};
const getMeta = () => getContentOrThrow().meta || {};

const replaceContent = (nextContent) => {
  validationErrors = validateContent(nextContent);
  if (validationErrors.length > 0) {
    return { ok: false, errors: validationErrors };
  }
  fs.writeFileSync(CONTENT_PATH, JSON.stringify(nextContent, null, 2));
  cachedContent = nextContent;
  return { ok: true, errors: [] };
};

const getValidationErrors = () => validationErrors;
const getProfile = () => requireContent().profile || {};
const getStats = () => requireContent().stats || {};
const getServices = () => requireContent().services || [];
const getService = (slug) => getServices().find((service) => service.slug === slug);
const getFAQ = () => requireContent().faq || [];
const getPosts = () => requireContent().posts || [];
const getPost = (id) => (requireContent().posts || []).find((post) => post.id === Number(id));
const getHoroscopeDaily = (sign) => {
  const key = (sign || '').toLowerCase();
  if (!key) {
    return null;
  }
  return requireContent().horoscope?.daily?.[key] || null;
};
const getSnippetsByKeys = (keys = []) => {
  if (!Array.isArray(keys)) {
    return [];
  }
  const keySet = new Set(keys);
  return (requireContent().interpretation_library?.snippets || []).filter((snippet) =>
    keySet.has(snippet.key)
  );
};
const getReportConfig = () => requireContent().report_config || {};

module.exports = {
  initializeContentStore,
  getProfile,
  getStats,
  getServices,
  getService,
  getFAQ,
  getPosts,
  getPost,
  getHoroscopeDaily,
  getSnippetsByKeys,
  getAllSnippets,
  getReportConfig,
  getMeta,
  replaceContent,
  getValidationErrors,
  REQUIRED_WHATSAPP,
  CANONICAL_SECTIONS,
  ALLOWED_SNIPPET_TYPES
  getReportConfig
};
