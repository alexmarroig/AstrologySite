const express = require('express');
const crypto = require('crypto');
const db = require('../../db');
const { optionalAuth, authenticate, requireAdmin } = require('../../middleware/auth');
const { hashIp, sanitizeProps } = require('../../utils/analytics');

const router = express.Router();

const NECESSARY_EVENTS = new Set(['page_view']);

const toDateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeUtm = (utm) => (utm && typeof utm === 'object' ? utm : null);

const updateUserUtm = async (userId, utm) => {
  if (!utm) return;
  await db.query(
    `UPDATE users
     SET utm_first_touch_json = COALESCE(utm_first_touch_json, $2),
         utm_last_touch_json = $2,
         updated_at = NOW()
     WHERE id = $1`,
    [userId, utm]
  );
};

const updateLeadUtm = async (leadId, utm) => {
  if (!utm) return;
  await db.query(
    `UPDATE leads
     SET utm_first_touch_json = COALESCE(utm_first_touch_json, $2),
         utm_last_touch_json = $2
     WHERE id = $1`,
    [leadId, utm]
  );
};

const resolveConsent = async (userId) => {
  if (!userId) {
    return { consentAnalytics: true };
  }
  const result = await db.query(
    'SELECT consent_analytics FROM users WHERE id = $1',
    [userId]
  );
  if (result.rows.length === 0) {
    return { consentAnalytics: true };
  }
  return { consentAnalytics: Boolean(result.rows[0].consent_analytics) };
};

router.post('/track', optionalAuth, async (req, res) => {
  try {
    const {
      event_name: eventName,
      anonymous_id: anonymousId,
      session_id: sessionId,
      page_url: pageUrl,
      referrer,
      service_slug: serviceSlug,
      payload,
      utm,
      ts,
      consent_analytics: consentOverride,
    } = req.body || {};

    if (!eventName || !anonymousId || !sessionId || !pageUrl) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const eventTs = toDateOrNull(ts) || new Date();
    let utmData = normalizeUtm(utm);
    const sanitizedPayload = sanitizeProps(payload);
    const { consentAnalytics } = await resolveConsent(req.user && req.user.id);
    const effectiveConsent = consentOverride === false ? false : consentAnalytics;
    const shouldStore = effectiveConsent || NECESSARY_EVENTS.has(eventName);

    if (!shouldStore) {
      return res.status(200).json({ status: 'consent_required' });
    }

    const ipHash = effectiveConsent ? hashIp(req.ip || '') : null;
    const userAgent = effectiveConsent ? req.headers['user-agent'] || null : null;

    if (req.user && req.user.id) {
      if (!utmData) {
        const existingUtm = await db.query(
          'SELECT utm_last_touch_json FROM users WHERE id = $1',
          [req.user.id]
        );
        if (existingUtm.rows[0] && existingUtm.rows[0].utm_last_touch_json) {
          utmData = existingUtm.rows[0].utm_last_touch_json;
        }
      }
      await db.query('UPDATE users SET last_seen_at = NOW() WHERE id = $1', [req.user.id]);
      await updateUserUtm(req.user.id, utmData);
    } else if (!utmData) {
      const leadResult = await db.query(
        'SELECT utm_last_touch_json FROM leads WHERE anonymous_id = $1',
        [anonymousId]
      );
      if (leadResult.rows[0] && leadResult.rows[0].utm_last_touch_json) {
        utmData = leadResult.rows[0].utm_last_touch_json;
      }
    }

    let leadId = null;
    if (!req.user || !req.user.id) {
      const leadResult = await db.query('SELECT id FROM leads WHERE anonymous_id = $1', [
        anonymousId,
      ]);
      leadId = leadResult.rows[0] ? leadResult.rows[0].id : null;
    }

    await db.query(
      `INSERT INTO analytics_events
       (id, created_at, event_name, user_id, lead_id, anonymous_id, session_id, page_url, referrer, service_slug, payload_json, utm_json, ip_hash, user_agent, consent_analytics)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        crypto.randomUUID(),
        eventTs,
        eventName,
        req.user ? req.user.id : null,
        leadId,
        anonymousId,
        sessionId,
        pageUrl,
        referrer || null,
        serviceSlug || null,
        effectiveConsent ? sanitizedPayload : null,
        utmData,
        ipHash,
        userAgent,
        effectiveConsent,
      ]
    );

    return res.status(201).json({ status: 'ok' });
  } catch (error) {
    console.error('Erro ao registrar tracking:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/identify', optionalAuth, async (req, res) => {
  try {
    const {
      anonymous_id: anonymousId,
      user_id: userId,
      email,
      whatsapp,
      name,
      utm,
    } = req.body || {};

    if (!anonymousId || (!userId && !email && !whatsapp && !name)) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const utmData = normalizeUtm(utm);

    if (userId) {
      await db.query(
        'UPDATE analytics_events SET user_id = $1 WHERE anonymous_id = $2 AND user_id IS NULL',
        [userId, anonymousId]
      );
      await updateUserUtm(userId, utmData);
      return res.status(200).json({ status: 'linked', user_id: userId });
    }

    const leadResult = await db.query(
      `INSERT INTO leads (email, whatsapp, name, anonymous_id, utm_first_touch_json, utm_last_touch_json)
       VALUES ($1, $2, $3, $4, $5, $5)
       ON CONFLICT (anonymous_id)
       DO UPDATE SET email = COALESCE(EXCLUDED.email, leads.email),
                     whatsapp = COALESCE(EXCLUDED.whatsapp, leads.whatsapp),
                     name = COALESCE(EXCLUDED.name, leads.name),
                     utm_last_touch_json = COALESCE(EXCLUDED.utm_last_touch_json, leads.utm_last_touch_json)
       RETURNING id, (xmax = 0) AS inserted`,
      [email || null, whatsapp || null, name || null, anonymousId, utmData]
    );
    const leadId = leadResult.rows[0].id;
    const wasInserted = leadResult.rows[0].inserted;

    await db.query(
      'UPDATE analytics_events SET lead_id = $1 WHERE anonymous_id = $2 AND lead_id IS NULL',
      [leadId, anonymousId]
    );
    await updateLeadUtm(leadId, utmData);

    if (wasInserted) {
      await db.query(
        `INSERT INTO analytics_events
         (id, created_at, event_name, lead_id, anonymous_id, session_id, page_url, payload_json, utm_json, consent_analytics)
         VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          crypto.randomUUID(),
          'lead_created',
          leadId,
          anonymousId,
          null,
          null,
          sanitizeProps({ email: !!email, whatsapp: !!whatsapp }),
          utmData,
          true,
        ]
      );
    }

    return res.status(200).json({ status: 'linked', lead_id: leadId });
  } catch (error) {
    console.error('Erro ao identificar lead:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
