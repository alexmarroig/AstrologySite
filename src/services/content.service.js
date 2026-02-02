const fs = require('fs');
const path = require('path');

const CONTENT_PATH = path.join(__dirname, '..', '..', 'data', 'astrolumen_content_v1.json');
let cachedContent = null;

const loadContent = () => {
  if (cachedContent) {
    return cachedContent;
  }

  const raw = fs.readFileSync(CONTENT_PATH, 'utf-8');
  cachedContent = JSON.parse(raw);
  return cachedContent;
};

const getServices = () => loadContent().services || [];
const getServiceBySlug = (slug) =>
  (loadContent().services || []).find((service) => service.slug === slug);
const getProfile = () => loadContent().profile || {};
const getFaq = () => loadContent().faq || [];
const getStats = () => loadContent().stats || {};
const getPosts = () =>
  (loadContent().posts || []).map(({ id, titulo, resumo, autor, data_publicacao, imagem }) => ({
    id,
    titulo,
    resumo,
    autor,
    data_publicacao,
    imagem
  }));
const getPostById = (id) => (loadContent().posts || []).find((post) => post.id === Number(id));

module.exports = {
  getServices,
  getServiceBySlug,
  getProfile,
  getFaq,
  getStats,
  getPosts,
  getPostById
};
