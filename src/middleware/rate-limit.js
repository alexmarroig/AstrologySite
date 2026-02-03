const rateBuckets = new Map();

const buildKey = (req, keyParts) => {
  const base = keyParts.filter(Boolean).join(':');
  return base || req.ip;
};

const rateLimit = ({ windowMs = 60000, max = 30, keyParts = [] } = {}) => (req, res, next) => {
  const now = Date.now();
  const key = buildKey(req, keyParts.map((part) => (typeof part === 'function' ? part(req) : part)));
  const bucket = rateBuckets.get(key) || [];
  const recent = bucket.filter((timestamp) => now - timestamp < windowMs);
  recent.push(now);
  rateBuckets.set(key, recent);

  if (recent.length > max) {
    return res.status(429).json({ error: 'Muitas requisições, tente novamente' });
  }
  return next();
};

module.exports = { rateLimit };
