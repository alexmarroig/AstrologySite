const ADMIN_KEY = process.env.ADMIN_KEY;

const requireAdmin = (req, res, next) => {
  const token = req.header('x-admin-key') || req.query.admin_key;
  if (!ADMIN_KEY || token !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Acesso admin negado' });
  }
  return next();
};

module.exports = {
  requireAdmin
};
const getAdminToken = (req) => {
  const headerKey = req.headers['x-admin-key'];
  if (headerKey) {
    return String(headerKey);
  }
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const [type, token] = authHeader.split(' ');
    if (type && type.toLowerCase() === 'bearer' && token) {
      return token;
    }
  }
  return null;
};

const requireAdminKey = (req, res, next) => {
  const expectedKey = process.env.ADMIN_KEY;
  if (!expectedKey) {
    return res.status(500).json({ error: 'ADMIN_KEY não configurada' });
  }

  const providedKey = getAdminToken(req);
  if (!providedKey || providedKey !== expectedKey) {
    return res.status(403).json({ error: 'Acesso administrativo negado' });
  }

  return next();
};

module.exports = { requireAdminKey };
