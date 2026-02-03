const express = require('express');

const reportService = require('../services/report.service');

const router = express.Router();
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

router.post('/reports/:orderId/generate', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token || token !== ADMIN_TOKEN) {
      return res.status(403).json({ error: 'Não é admin' });
    }

    const { orderId } = req.params;
    const report = await reportService.generateReportDocx(orderId);
    return res.json({
      message: 'Relatório gerado com sucesso.',
      ...report,
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
