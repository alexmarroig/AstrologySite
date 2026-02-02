const contentService = require('../services/content.service');

const listServices = (req, res) => {
  res.json(contentService.getServices());
};

const getService = (req, res) => {
  const service = contentService.getServiceBySlug(req.params.slug);

  if (!service) {
    return res.status(404).json({ message: 'Serviço não encontrado.' });
  }

  return res.json(service);
};

const getProfile = (req, res) => {
  res.json(contentService.getProfile());
};

const getFaq = (req, res) => {
  res.json(contentService.getFaq());
};

const listPosts = (req, res) => {
  res.json(contentService.getPosts());
};

const getPost = (req, res) => {
  const post = contentService.getPostById(req.params.id);

  if (!post) {
    return res.status(404).json({ message: 'Post não encontrado.' });
  }

  return res.json(post);
};

const getStats = (req, res) => {
  res.json(contentService.getStats());
};

module.exports = {
  listServices,
  getService,
  getProfile,
  getFaq,
  listPosts,
  getPost,
  getStats
};
