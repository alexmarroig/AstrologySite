const express = require('express');

const authMiddleware = require('../auth/auth.middleware');
const ephemerisService = require('../services/ephemeris.service');
const interpretationService = require('../services/interpretation.service');
const llmOptimizedService = require('../services/llm-optimized.service');
const db = require('../db');

const router = express.Router();

router.post('/natal-chart', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const { birthDate, birthTime, birthLocation } = req.body;

    if (!birthDate || !birthTime || !birthLocation) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const chartData = await ephemerisService.calculateNatalChart(
      birthDate,
      birthTime,
      birthLocation
    );

    const interpretations = await interpretationService.getChartInterpretations(chartData);

    const analysis = await llmOptimizedService.synthesizeNatalChart(
      chartData,
      interpretations,
      req.user.name
    );

    const orderResult = await db.query(
      'INSERT INTO orders (user_id, service_type, status) VALUES ($1, $2, $3) RETURNING id',
      [req.user.id, 'natal-chart', 'completed']
    );

    await db.query(
      'INSERT INTO analyses (order_id, user_id, analysis_type, ephemeris_data, llm_analysis) VALUES ($1, $2, $3, $4, $5)',
      [
        orderResult.rows[0].id,
        req.user.id,
        'natal-chart',
        JSON.stringify({ chartData, interpretations }),
        analysis,
      ]
    );

    return res.json({
      success: true,
      data: { chartData, interpretations, analysis },
      stats: {
        totalInterpretationsUsed:
          Object.keys(interpretations.planets).length +
          Object.keys(interpretations.houses).length +
          interpretations.aspects.length,
      },
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await interpretationService.getStats();
    return res.json(stats);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
