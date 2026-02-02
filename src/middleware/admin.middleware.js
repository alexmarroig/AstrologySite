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
