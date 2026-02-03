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
