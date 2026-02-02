const { services, findServiceBySlug } = require('../data/content/services');
const { profile } = require('../data/content/profile');
const { faq } = require('../data/content/faq');
const { stats } = require('../data/content/stats');
const { listPostSummaries, findPostById } = require('../data/content/posts');

const getServices = () => services;
const getServiceBySlug = (slug) => findServiceBySlug(slug);
const getProfile = () => profile;
const getFaq = () => faq;
const getStats = () => stats;
const getPosts = () => listPostSummaries();
const getPostById = (id) => findPostById(id);

module.exports = {
  getServices,
  getServiceBySlug,
  getProfile,
  getFaq,
  getStats,
  getPosts,
  getPostById
};
