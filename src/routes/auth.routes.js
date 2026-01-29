const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const db = require('../db');

const router = express.Router();

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRATION || '1d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRATION || '7d';

const buildTokens = (payload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

  return {
    accessToken,
    refreshToken,
  };
};

router.post('/register', async (req, res) => {
  try {
    const { email, name, full_name: fullName, password, phone } = req.body;
    const resolvedName = fullName || name;
    if (!email || !resolvedName || !password) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (email, name, password_hash, phone) VALUES ($1, $2, $3, $4) RETURNING id, email, name, phone',
      [email.toLowerCase(), resolvedName, passwordHash, phone || null]
    );

    const user = result.rows[0];
    const tokens = buildTokens({ id: user.id, email: user.email, name: user.name });

    return res.status(201).json({
      id: user.id,
      email: user.email,
      full_name: user.name,
      phone: user.phone,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: 86400,
      user,
      token: tokens.accessToken,
    });
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
      'SELECT id, email, name, password_hash, is_active FROM users WHERE email = $1',
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

    if (user.is_active === false) {
      return res.status(403).json({ error: 'Usuário desativado' });
    }

    const tokens = buildTokens({ id: user.id, email: user.email, name: user.name });

    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    return res.json({
      id: user.id,
      email: user.email,
      full_name: user.name,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: 86400,
      user: { id: user.id, email: user.email, name: user.name },
      token: tokens.accessToken,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token: refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token ausente' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const tokens = buildTokens({ id: decoded.id, email: decoded.email, name: decoded.name });

    return res.json({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: 86400,
    });
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await db.query(
      'SELECT id, email, name, phone, created_at FROM users WHERE id = $1',
      [decoded.id]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      full_name: user.name,
      phone: user.phone,
      created_at: user.created_at,
    });
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;
