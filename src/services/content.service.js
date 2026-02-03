const contentStore = require('../content/contentStore');

const getServices = () => contentStore.getServices();
const getServiceBySlug = (slug) => contentStore.getService(slug);
const getProfile = () => contentStore.getProfile();
const getFaq = () => contentStore.getFAQ();
const getStats = () => contentStore.getStats();
const getPosts = () =>
  contentStore.getPosts().map((post) => ({
    id: post.id,
    slug: post.slug,
    titulo: post.titulo,
    resumo: post.resumo,
    autor: post.autor,
    data_publicacao: post.data_publicacao,
    imagem: post.imagem
  }));
const getReportConfig = () => contentStore.getReportConfig();
const getHoroscopeDaily = (sign) => contentStore.getHoroscopeDaily(sign);

const getPosts = () =>
  contentStore.getPosts().map(({ id, titulo, resumo, autor, data_publicacao, imagem }) => ({
    id,
    titulo,
    resumo,
    autor,
    data_publicacao,
    imagem
  }));

const getPostById = (id) => contentStore.getPost(id);

module.exports = {
  getServices,
  getServiceBySlug,
  getProfile,
  getFaq,
  getStats,
  getReportConfig,
  getHoroscopeDaily,
  getPosts,
  getPostById
};
