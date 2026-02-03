const express = require('express');
const db = require('../../db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, slug, name, price_cents, delivery_days_min, delivery_days_max FROM services WHERE active = true ORDER BY id'
    );
    return res.json({ services: result.rows });
  } catch (error) {
    console.error('Erro ao listar serviços:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
