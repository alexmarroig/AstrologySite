const contentStore = require('../content/contentStore');

const getServices = () => contentStore.getServices();
const getServiceBySlug = (slug) => contentStore.getService(slug);
const getProfile = () => contentStore.getProfile();
const getFaq = () => contentStore.getFAQ();
const getStats = () => contentStore.getStats();
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
