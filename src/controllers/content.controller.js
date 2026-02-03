const contentService = require('../services/content.service');

const withErrorHandling = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error('Erro ao carregar conteúdo:', error);
    res.status(500).json({ message: 'Conteúdo indisponível no momento.' });
  }
};

const listServices = withErrorHandling((req, res) => {
  res.json(contentService.getServices());
});

const getService = withErrorHandling((req, res) => {
const listServices = (req, res) => {
  res.json(contentService.getServices());
};

const getService = (req, res) => {
  const service = contentService.getServiceBySlug(req.params.slug);

  if (!service) {
    return res.status(404).json({ message: 'Serviço não encontrado.' });
  }

  return res.json(service);
});

const getProfile = withErrorHandling((req, res) => {
  res.json(contentService.getProfile());
});

const getFaq = withErrorHandling((req, res) => {
  res.json(contentService.getFaq());
});

const listPosts = withErrorHandling((req, res) => {
  res.json(contentService.getPosts());
});

const getPost = withErrorHandling((req, res) => {
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
});

const getStats = withErrorHandling((req, res) => {
  res.json(contentService.getStats());
});
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
