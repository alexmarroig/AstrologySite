const contentStore = require('./content-store.service');

const getServices = () => contentStore.getServices();
const getServiceBySlug = (slug) => contentStore.getService(slug);
const getProfile = () => contentStore.getProfile();
const getFaq = () => contentStore.getFAQ();
const getStats = () => contentStore.getStats();
const getPosts = () => contentStore.getPosts();
const getPostById = (id) => contentStore.getPost(id);

module.exports = {
  getServices,
  getServiceBySlug,
  getProfile,
  getFaq,
  getStats,
  getPosts,
  getPostById
};
