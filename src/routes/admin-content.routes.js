const express = require('express');

const adminContentController = require('../controllers/admin-content.controller');

const router = express.Router();

router.get('/content/export', adminContentController.exportContent);
router.post('/content/import', adminContentController.importContent);
router.get('/snippets', adminContentController.listSnippets);
router.post('/snippets', adminContentController.createSnippet);
router.patch('/snippets/:key', adminContentController.updateSnippet);

module.exports = router;
