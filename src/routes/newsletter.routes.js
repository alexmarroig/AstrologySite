const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email obrigatório' });
    }

    await db.query(
      'INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
      [email.toLowerCase()]
    );

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error('Erro ao inscrever newsletter:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
