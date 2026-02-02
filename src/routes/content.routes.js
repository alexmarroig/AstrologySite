const express = require('express');

const { services, findServiceBySlug } = require('../data/services');
const { profile } = require('../data/profile');
const { listPostSummaries, findPostById } = require('../data/posts');
const { stats } = require('../data/stats');

const router = express.Router();

router.get('/services', (req, res) => {
  res.json(services);
});

router.get('/services/:slug', (req, res) => {
  const service = findServiceBySlug(req.params.slug);

  if (!service) {
    return res.status(404).json({ message: 'Serviço não encontrado.' });
  }

  return res.json(service);
});

router.get('/profile', (req, res) => {
  res.json(profile);
});

router.get('/posts', (req, res) => {
  res.json(listPostSummaries());
});

router.get('/posts/:id', (req, res) => {
  const post = findPostById(req.params.id);

  if (!post) {
    return res.status(404).json({ message: 'Post não encontrado.' });
  }

  return res.json(post);
});

router.get('/stats', (req, res) => {
  res.json(stats);
});

module.exports = router;
