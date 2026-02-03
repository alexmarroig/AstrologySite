const db = require('../../db');
const { generateReportForOrder } = require('../../reports/reportService');

const generateReport = async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [orderId]);
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const { reportUrl, filePath } = await generateReportForOrder(order);

    return res.json({ orderId, report_url: reportUrl, file_path: filePath });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  generateReport
};
