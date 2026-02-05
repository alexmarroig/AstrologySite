const crypto = require('crypto');
const db = require('../db');

const EXCLUDED_PREFIXES = ['/health', '/openapi.json', '/uploads', '/v1/analytics', '/v1/track'];

const shouldTrackPath = (path) => {
  if (!path) return false;
  return !EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix));
};

const userActivityTracker = (req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    if (!req.user || !req.user.id) {
      return;
    }
    if (!shouldTrackPath(req.path)) {
      return;
    }
    if (res.statusCode >= 500) {
      return;
    }

    const payload = {
      method: req.method,
      path: req.originalUrl || req.path,
      status_code: res.statusCode,
      duration_ms: Date.now() - startedAt,
    };

    db.query(
      `INSERT INTO analytics_events
       (id, event_name, user_id, page_url, payload_json, consent_analytics)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [crypto.randomUUID(), 'user_action', req.user.id, req.originalUrl || req.path, payload, true]
    ).catch((error) => {
      console.error('Erro ao registrar user_action:', error.message);
    });
  });

  next();
};

module.exports = {
  userActivityTracker,
};
