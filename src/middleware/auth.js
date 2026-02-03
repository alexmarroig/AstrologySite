const jwt = require('jsonwebtoken');
const db = require('../db');

const getToken = (req) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.split(' ')[1];
};

const loadUserProfile = async (userId) => {
  const result = await db.query(
    `SELECT users.id, users.email, users.name, profiles.role
     FROM users
     LEFT JOIN profiles ON profiles.user_id = users.id
     WHERE users.id = $1`,
    [userId]
  );
  return result.rows[0];
};

const normalizeRole = (user) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'camila@astrolumen.com';
  if (user.role === 'admin' && user.email !== adminEmail) {
    return 'user';
  }
  return user.role || 'user';
};

const authenticate = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await loadUserProfile(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: normalizeRole({ ...user, role: user.role || decoded.role }),
    };
    return next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

const optionalAuth = async (req, res, next) => {
  const token = getToken(req);
  if (!token) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await loadUserProfile(decoded.id);
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: normalizeRole({ ...user, role: user.role || decoded.role }),
      };
    }
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' });
  }
  return next();
};

const requireAdmin = (options = {}) => async (req, res, next) => {
  const adminEmail = options.adminEmail || process.env.ADMIN_EMAIL || 'camila@astrolumen.com';
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  if (req.user.role !== 'admin' || req.user.email !== adminEmail) {
    return res.status(403).json({ error: 'Acesso restrito ao admin' });
  }
  return next();
};

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin,
};
