const express = require('express');

const adminContentController = require('../controllers/admin-content.controller');

const router = express.Router();

router.post('/content/import', adminContentController.importContent);
router.get('/content/export', adminContentController.exportContent);
router.get('/snippets', adminContentController.listSnippets);
router.post('/snippets', adminContentController.createSnippet);
router.patch('/snippets', adminContentController.updateSnippet);

module.exports = router;
