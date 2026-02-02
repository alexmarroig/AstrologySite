const express = require('express');

const { requireAdminKey } = require('../middleware/admin.middleware');
const adminReportsController = require('../controllers/admin-reports.controller');

const router = express.Router();

router.post('/reports/:orderId/generate', requireAdminKey, adminReportsController.generateReport);

module.exports = router;
