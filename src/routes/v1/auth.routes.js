const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../db');

const router = express.Router();

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRATION || '1d';

const buildToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });

router.post('/login-admin', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const result = await db.query(
      `SELECT users.id, users.email, users.name, users.password_hash,
              COALESCE(users.role, profiles.role, 'user') AS role
       FROM users
       LEFT JOIN profiles ON profiles.user_id = users.id
       WHERE users.email = $1`,
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

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito ao admin' });
    }

    const token = buildToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'admin',
    });

    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    return res.json({
      access_token: token,
      expires_in: 86400,
      user: { id: user.id, email: user.email, name: user.name, role: 'admin' },
    });
  } catch (error) {
    console.error('Erro no login admin:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
