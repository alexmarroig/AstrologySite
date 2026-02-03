const express = require('express');
const { requireAdmin } = require('../../middleware/admin.middleware');
const controller = require('../../controllers/admin/content.controller');

const router = express.Router();

router.get('/content/export', requireAdmin, controller.exportContent);
router.post('/content/import', requireAdmin, controller.importContent);
router.get('/snippets', requireAdmin, controller.listSnippets);
router.post('/snippets', requireAdmin, controller.addSnippet);
router.patch('/snippets/:key', requireAdmin, controller.updateSnippet);

module.exports = router;
