const express = require('express');
const contentController = require('../controllers/content.controller');

const router = express.Router();

router.get('/services', contentController.listServices);
router.get('/services/:slug', contentController.getService);
router.get('/profile', contentController.getProfile);
router.get('/faq', contentController.getFaq);
router.get('/posts', contentController.listPosts);
router.get('/posts/:id', contentController.getPost);
router.get('/stats', contentController.getStats);

module.exports = router;
