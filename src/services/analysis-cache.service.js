const crypto = require('crypto');

const db = require('../db');

const DEFAULT_CACHE_DAYS = 30;

const buildHash = (payload) =>
  crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

const buildExpiry = () => {
  const now = new Date();
  now.setDate(now.getDate() + DEFAULT_CACHE_DAYS);
  return now;
};

class AnalysisCacheService {
  buildHash(payload) {
    return buildHash(payload);
  }

  async getCachedAnalysis(hash, analysisType) {
    const result = await db.query(
      `SELECT id, ephemeris_data, houses_data, aspects_data, interpretations, calculated_at
       FROM analysis_cache
       WHERE birth_data_hash = $1 AND analysis_type = $2 AND (expires_at IS NULL OR expires_at > NOW())
       LIMIT 1`,
      [hash, analysisType]
    );
    return result.rows[0] || null;
  }

  async storeCachedAnalysis(hash, analysisType, payload) {
    const { ephemeris, houses, aspects, interpretations } = payload;
    const expiresAt = buildExpiry();

    const result = await db.query(
      `INSERT INTO analysis_cache
        (birth_data_hash, analysis_type, ephemeris_data, houses_data, aspects_data, interpretations, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (birth_data_hash)
       DO UPDATE SET
         analysis_type = EXCLUDED.analysis_type,
         ephemeris_data = EXCLUDED.ephemeris_data,
         houses_data = EXCLUDED.houses_data,
         aspects_data = EXCLUDED.aspects_data,
         interpretations = EXCLUDED.interpretations,
         calculated_at = NOW(),
         expires_at = EXCLUDED.expires_at
       RETURNING id`,
      [
        hash,
        analysisType,
        JSON.stringify(ephemeris || {}),
        JSON.stringify(houses || {}),
        JSON.stringify(aspects || []),
        JSON.stringify(interpretations || []),
        expiresAt,
      ]
    );

    return result.rows[0];
  }
}

module.exports = new AnalysisCacheService();
