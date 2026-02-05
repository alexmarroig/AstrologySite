const express = require('express');
const db = require('../../db');
const { optionalAuth, authenticate, requireAdmin } = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rate-limit');
const { hashIp, sanitizeProps, detectDevice } = require('../../utils/analytics');
const crypto = require('crypto');

const router = express.Router();

const TRACK_EVENT_NAMES = new Set([
  'page_view',
  'click_cta',
  'form_start',
  'form_submit',
  'checkout_start',
  'checkout_success',
  'service_view',
  'scroll_depth',
  'time_on_page',
]);

router.post(
  '/track',
  rateLimit({
    windowMs: Number(process.env.ANALYTICS_RATE_LIMIT_WINDOW_MS || 60000),
    max: Number(process.env.ANALYTICS_RATE_LIMIT_MAX || 30),
    keyParts: [
      (req) => req.body && req.body.session_id,
      (req) => req.ip,
    ],
  }),
  optionalAuth,
  async (req, res) => {
    try {
      const {
        event,
        page,
        referrer,
        session_id: sessionId,
        ts,
        props,
        utm,
        consent_analytics: consentAnalytics,
      } = req.body || {};

      if (!event || !sessionId || !TRACK_EVENT_NAMES.has(event)) {
        return res.status(400).json({ error: 'Evento inválido' });
      }

      const eventTs = ts ? new Date(ts) : new Date();
      if (Number.isNaN(eventTs.getTime())) {
        return res.status(400).json({ error: 'Timestamp inválido' });
      }

      if (consentAnalytics === false) {
        return res.status(200).json({ status: 'consent_required' });
      }

      const ipHash = hashIp(req.ip || '');
      const userAgent = req.headers['user-agent'] || '';
      const sanitizedProps = sanitizeProps(props);
      const utmData = utm || {};

      const existingSession = await db.query(
        'SELECT session_id FROM analytics_sessions WHERE session_id = $1',
        [sessionId]
      );

      if (existingSession.rows.length === 0) {
        await db.query(
          `INSERT INTO analytics_sessions
          (session_id, first_seen_at, last_seen_at, user_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, landing_page, device, ip_hash, user_agent, consent_analytics)
          VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            sessionId,
            eventTs,
            req.user ? req.user.id : null,
            utmData.source || null,
            utmData.medium || null,
            utmData.campaign || null,
            utmData.content || null,
            utmData.term || null,
            page || null,
            detectDevice(userAgent),
            ipHash,
            userAgent,
            Boolean(consentAnalytics),
          ]
        );
      } else {
        await db.query(
          'UPDATE analytics_sessions SET last_seen_at = $2, user_id = COALESCE($3, user_id) WHERE session_id = $1',
          [sessionId, eventTs, req.user ? req.user.id : null]
        );
      }

      await db.query(
        `INSERT INTO analytics_events
        (id, created_at, event_name, user_id, anonymous_id, session_id, page_url, referrer, payload_json, utm_json, ip_hash, user_agent, consent_analytics)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          crypto.randomUUID(),
          eventTs,
          event,
          req.user ? req.user.id : null,
          sessionId,
          sessionId,
          page || null,
          referrer || null,
          sanitizedProps,
          utmData || null,
          ipHash,
          userAgent,
          Boolean(consentAnalytics),
        ]
      );

      console.info('Analytics event tracked', {
        event,
        page,
        sessionId,
      });

      return res.status(201).json({ status: 'ok' });
    } catch (error) {
      console.error('Erro ao registrar analytics:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }
);

router.get('/summary', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = to ? new Date(to) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Período inválido' });
    }

    const visitsResult = await db.query(
      'SELECT COUNT(*) AS count FROM analytics_sessions WHERE first_seen_at BETWEEN $1 AND $2',
      [start, end]
    );
    const uniqueUsersResult = await db.query(
      'SELECT COUNT(DISTINCT user_id) AS count FROM analytics_events WHERE created_at BETWEEN $1 AND $2 AND user_id IS NOT NULL',
      [start, end]
    );
    const leadsResult = await db.query(
      "SELECT COUNT(*) AS count FROM analytics_events WHERE event_name = 'form_submit' AND created_at BETWEEN $1 AND $2",
      [start, end]
    );
    const ordersCreatedResult = await db.query(
      'SELECT COUNT(*) AS count FROM orders WHERE created_at BETWEEN $1 AND $2',
      [start, end]
    );
    const paidOrdersResult = await db.query(
      "SELECT COUNT(*) AS count, COALESCE(SUM(amount_cents), 0) AS revenue FROM orders WHERE status = 'paid' AND updated_at BETWEEN $1 AND $2",
      [start, end]
    );

    const topPagesResult = await db.query(
      `SELECT page_url AS page, COUNT(*) AS views
       FROM analytics_events
       WHERE event_name = 'page_view' AND created_at BETWEEN $1 AND $2
       GROUP BY page_url
       ORDER BY views DESC
       LIMIT 10`,
      [start, end]
    );

    const funnelStages = ['home', 'service_view', 'form_start', 'checkout_start', 'checkout_success'];
    const funnel = {};
    for (const stage of funnelStages) {
      const eventName = stage === 'home' ? 'page_view' : stage;
      const pageFilter = stage === 'home' ? '/' : null;
      const result = await db.query(
        `SELECT COUNT(DISTINCT session_id) AS count
         FROM analytics_events
         WHERE event_name = $1
           AND created_at BETWEEN $2 AND $3
           AND ($4::text IS NULL OR page_url = $4)`,
        [eventName, start, end, pageFilter]
      );
      funnel[stage] = Number(result.rows[0].count || 0);
    }

    return res.json({
      visits: Number(visitsResult.rows[0].count || 0),
      unique_users: Number(uniqueUsersResult.rows[0].count || 0),
      leads: Number(leadsResult.rows[0].count || 0),
      orders_created: Number(ordersCreatedResult.rows[0].count || 0),
      paid_orders: Number(paidOrdersResult.rows[0].count || 0),
      revenue: Number(paidOrdersResult.rows[0].revenue || 0),
      top_pages: topPagesResult.rows.map((row) => ({
        page: row.page,
        views: Number(row.views || 0),
      })),
      funnel,
    });
  } catch (error) {
    console.error('Erro no summary analytics:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});


router.get('/users/activity', authenticate, requireAdmin(), async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const result = await db.query(
      `SELECT users.id AS user_id,
              users.email,
              users.name,
              MAX(events.created_at) AS last_activity_at,
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'event_name', events.event_name,
                  'page_url', events.page_url,
                  'created_at', events.created_at,
                  'payload_json', events.payload_json
                )
                ORDER BY events.created_at DESC
              ) FILTER (WHERE events.id IS NOT NULL) AS recent_events
       FROM users
       LEFT JOIN LATERAL (
         SELECT id, event_name, page_url, created_at, payload_json
         FROM analytics_events
         WHERE user_id = users.id
         ORDER BY created_at DESC
         LIMIT 10
       ) events ON true
       GROUP BY users.id, users.email, users.name
       ORDER BY last_activity_at DESC NULLS LAST
       LIMIT $1`,
      [limit]
    );

    return res.json({ users: result.rows });
  } catch (error) {
    console.error('Erro no activity analytics:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/user/:userId/timeline', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { userId } = req.params;
    const page = Number(req.query.page || 1);
    const pageSize = Math.min(Number(req.query.page_size || 50), 100);
    const offset = (page - 1) * pageSize;

    const eventsResult = await db.query(
      `SELECT id, event_name, page_url, created_at, payload_json, referrer
       FROM analytics_events
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    );
    const ordersResult = await db.query(
      'SELECT id, status, amount_cents, currency, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return res.json({
      events: eventsResult.rows,
      orders: ordersResult.rows,
      pagination: { page, page_size: pageSize },
    });
  } catch (error) {
    console.error('Erro no timeline analytics:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
