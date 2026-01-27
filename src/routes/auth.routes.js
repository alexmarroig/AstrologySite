const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const db = require('../db');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email.toLowerCase(), name, passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({ user, token });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }
    console.error('Erro no registro:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const result = await db.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

module.exports = router;
