const express = require('express');
const { requireAdmin } = require('../../middleware/admin.middleware');
const controller = require('../../controllers/admin/reports.controller');

const router = express.Router();

router.post('/reports/:orderId/generate', requireAdmin, controller.generateReport);

module.exports = router;
