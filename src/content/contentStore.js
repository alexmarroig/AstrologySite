const fs = require('fs');
const path = require('path');
const { validateContent } = require('./validateContent');

const CONTENT_PATH = path.join(__dirname, '..', '..', 'data', 'astrolumen_content_v1.json');

let cachedContent = null;
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
  getReportConfig
};
