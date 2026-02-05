const crypto = require('crypto');

const MAX_PROP_SIZE = 2000;
const SENSITIVE_KEYS = ['password', 'token', 'auth', 'email', 'phone', 'cpf', 'credit', 'card'];

const hashIp = (ip) => {
  const salt = process.env.IP_HASH_SALT || 'astrolumen';
  const version = process.env.IP_HASH_SALT_VERSION || 'v1';
  const digest = crypto.createHash('sha256').update(`${ip}-${salt}`).digest('hex');
  return `${version}:${digest}`;
};

const sanitizeProps = (props = {}) => {
  if (!props || typeof props !== 'object') {
    return {};
  }

  const sanitized = {};
  Object.entries(props).forEach(([key, value]) => {
    const lowered = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sensitive) => lowered.includes(sensitive))) {
      return;
    }
    if (typeof value === 'string') {
      sanitized[key] = value.slice(0, MAX_PROP_SIZE);
      return;
    }
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      sanitized[key] = value;
      return;
    }
    if (Array.isArray(value)) {
      sanitized[key] = value.slice(0, 50);
      return;
    }
    if (typeof value === 'object') {
      const serialized = JSON.stringify(value);
      sanitized[key] = serialized.length > MAX_PROP_SIZE ? serialized.slice(0, MAX_PROP_SIZE) : value;
    }
  });
  return sanitized;
};

const detectDevice = (userAgent = '') => {
  const agent = userAgent.toLowerCase();
  if (agent.includes('mobile')) return 'mobile';
  if (agent.includes('tablet')) return 'tablet';
  return 'desktop';
};

module.exports = {
  hashIp,
  sanitizeProps,
  detectDevice,
};
