const express = require('express');
const db = require('../../db');
const { authenticate, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

const buildPagination = (req, defaultSize = 20) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = Math.min(Number(req.query.page_size || defaultSize), 100);
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
};

const parseDateRange = (from, to) => {
  const start = from ? new Date(from) : null;
  const end = to ? new Date(to) : null;
  if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
    return null;
  }
  return { start, end };
};

const logAdminAction = async (adminUserId, action, targetType, targetId, meta = null, client = db) => {
  await client.query(
    `INSERT INTO audit_logs (admin_user_id, action, target_type, target_id, meta_json)
     VALUES ($1, $2, $3, $4, $5)`,
    [adminUserId, action, targetType, targetId ? String(targetId) : null, meta]
  );
};

router.get('/overview', authenticate, requireAdmin(), async (req, res) => {
  try {
    const range = parseDateRange(req.query.from, req.query.to);
    if (!range) {
      return res.status(400).json({ error: 'Período inválido' });
    }
    const { start, end } = range;

    const visitsResult = await db.query(
      `SELECT COUNT(*) AS count
       FROM analytics_events
       WHERE event_name = 'page_view'
         AND ($1::timestamp IS NULL OR created_at >= $1)
         AND ($2::timestamp IS NULL OR created_at <= $2)`,
      [start, end]
    );
    const leadsResult = await db.query(
      `SELECT COUNT(*) AS count
       FROM leads
       WHERE ($1::timestamp IS NULL OR created_at >= $1)
         AND ($2::timestamp IS NULL OR created_at <= $2)`,
      [start, end]
    );
    const signupsResult = await db.query(
      `SELECT COUNT(*) AS count
       FROM users
       WHERE ($1::timestamp IS NULL OR created_at >= $1)
         AND ($2::timestamp IS NULL OR created_at <= $2)`,
      [start, end]
    );
    const checkoutsResult = await db.query(
      `SELECT COUNT(*) AS count
       FROM analytics_events
       WHERE event_name = 'checkout_start'
         AND ($1::timestamp IS NULL OR created_at >= $1)
         AND ($2::timestamp IS NULL OR created_at <= $2)`,
      [start, end]
    );
    const paidResult = await db.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount_cents), 0) AS revenue
       FROM orders
       WHERE status = 'paid'
         AND ($1::timestamp IS NULL OR paid_at >= $1)
         AND ($2::timestamp IS NULL OR paid_at <= $2)`,
      [start, end]
    );
    const topServicesResult = await db.query(
      `SELECT service_slug, COUNT(*) AS count
       FROM orders
       WHERE status = 'paid'
         AND service_slug IS NOT NULL
         AND ($1::timestamp IS NULL OR paid_at >= $1)
         AND ($2::timestamp IS NULL OR paid_at <= $2)
       GROUP BY service_slug
       ORDER BY count DESC
       LIMIT 10`,
      [start, end]
    );

    const visits = Number(visitsResult.rows[0].count || 0);
    const paid = Number(paidResult.rows[0].count || 0);

    return res.json({
      visits,
      leads: Number(leadsResult.rows[0].count || 0),
      cadastros: Number(signupsResult.rows[0].count || 0),
      checkouts: Number(checkoutsResult.rows[0].count || 0),
      pagos: paid,
      conversao: visits > 0 ? paid / visits : 0,
      receita: Number(paidResult.rows[0].revenue || 0),
      top_servicos: topServicesResult.rows.map((row) => ({
        service_slug: row.service_slug,
        count: Number(row.count || 0),
      })),
    });
  } catch (error) {
    console.error('Erro no overview admin:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/funnel', authenticate, requireAdmin(), async (req, res) => {
  try {
    const range = parseDateRange(req.query.from, req.query.to);
    if (!range) {
      return res.status(400).json({ error: 'Período inválido' });
    }
    const { start, end } = range;
    const { service_slug: serviceSlug } = req.query;
    const stages = ['page_view', 'lead_created', 'checkout_start', 'payment_success'];
    const results = {};

    for (const stage of stages) {
      const result = await db.query(
        `SELECT COUNT(*) AS count
         FROM analytics_events
         WHERE event_name = $1
           AND ($2::text IS NULL OR service_slug = $2)
           AND ($3::timestamp IS NULL OR created_at >= $3)
           AND ($4::timestamp IS NULL OR created_at <= $4)`,
        [stage, serviceSlug || null, start, end]
      );
      results[stage] = Number(result.rows[0].count || 0);
    }

    return res.json(results);
  } catch (error) {
    console.error('Erro no funnel admin:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/users', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { query, search, from, to } = req.query;
    const { page, pageSize, offset } = buildPagination(req, 20);
    const searchTerm = (search || query) ? `%${(search || query).toLowerCase()}%` : null;
    const range = parseDateRange(from, to);
    if (!range) {
      return res.status(400).json({ error: 'Período inválido' });
    }
    const { start, end } = range;

    const result = await db.query(
      `SELECT users.id, users.email, users.name, users.created_at, profiles.role
       FROM users
       LEFT JOIN profiles ON profiles.user_id = users.id
       WHERE ($1::text IS NULL OR LOWER(users.email) LIKE $1 OR LOWER(users.name) LIKE $1)
         AND ($2::timestamp IS NULL OR users.created_at >= $2)
         AND ($3::timestamp IS NULL OR users.created_at <= $3)
       ORDER BY users.created_at DESC
       LIMIT $4 OFFSET $5`,
      [searchTerm, start, end, pageSize, offset]
    );

    return res.json({ users: result.rows, pagination: { page, page_size: pageSize } });
  } catch (error) {
    console.error('Erro ao listar usuários admin:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/users/:id', authenticate, requireAdmin(), async (req, res) => {
  try {
    const userId = req.params.id;
    const userResult = await db.query(
      `SELECT users.id, users.email, users.name, users.created_at, profiles.role
       FROM users
       LEFT JOIN profiles ON profiles.user_id = users.id
       WHERE users.id = $1`,
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const ordersResult = await db.query(
      'SELECT id, status, amount_cents, currency, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    const eventsResult = await db.query(
      `SELECT event_name, page_url, created_at FROM analytics_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );

    return res.json({ user, orders: ordersResult.rows, events: eventsResult.rows });
  } catch (error) {
    console.error('Erro ao buscar usuário admin:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/orders', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { status, service_slug: serviceSlug, from, to } = req.query;
    const { page, pageSize, offset } = buildPagination(req, 20);
    const range = parseDateRange(from, to);
    if (!range) {
      return res.status(400).json({ error: 'Período inválido' });
    }
    const { start, end } = range;

    const result = await db.query(
      `SELECT orders.id, orders.status, orders.amount_cents, orders.currency, orders.created_at, orders.service_slug, services.name AS service_name
       FROM orders
       LEFT JOIN services ON services.id = orders.service_id
       WHERE ($1::text IS NULL OR orders.status = $1)
         AND ($2::text IS NULL OR orders.service_slug = $2 OR services.slug = $2)
         AND ($3::timestamp IS NULL OR orders.created_at >= $3)
         AND ($4::timestamp IS NULL OR orders.created_at <= $4)
       ORDER BY orders.created_at DESC
       LIMIT $5 OFFSET $6`,
      [status || null, serviceSlug || null, start, end, pageSize, offset]
    );

    return res.json({ orders: result.rows, pagination: { page, page_size: pageSize } });
  } catch (error) {
    console.error('Erro ao listar pedidos admin:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/orders/:id', authenticate, requireAdmin(), async (req, res) => {
  try {
    const orderId = req.params.id;
    const result = await db.query(
      `SELECT orders.*, services.name AS service_name
       FROM orders
       LEFT JOIN services ON services.id = orders.service_id
       WHERE orders.id = $1`,
      [orderId]
    );
    const order = result.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    return res.json(order);
  } catch (error) {
    console.error('Erro ao buscar pedido admin:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/leads', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { search, from, to } = req.query;
    const { page, pageSize, offset } = buildPagination(req, 20);
    const searchTerm = search ? `%${search.toLowerCase()}%` : null;
    const range = parseDateRange(from, to);
    if (!range) {
      return res.status(400).json({ error: 'Período inválido' });
    }
    const { start, end } = range;

    const result = await db.query(
      `SELECT id, email, whatsapp, name, anonymous_id, created_at
       FROM leads
       WHERE ($1::text IS NULL OR LOWER(email) LIKE $1 OR LOWER(name) LIKE $1 OR whatsapp LIKE $1)
         AND ($2::timestamp IS NULL OR created_at >= $2)
         AND ($3::timestamp IS NULL OR created_at <= $3)
       ORDER BY created_at DESC
       LIMIT $4 OFFSET $5`,
      [searchTerm, start, end, pageSize, offset]
    );

    return res.json({ leads: result.rows, pagination: { page, page_size: pageSize } });
  } catch (error) {
    console.error('Erro ao listar leads admin:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/traffic', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { group_by: groupBy, from, to } = req.query;
    const range = parseDateRange(from, to);
    if (!range) {
      return res.status(400).json({ error: 'Período inválido' });
    }
    const { start, end } = range;

    let column;
    if (groupBy === 'utm_source') {
      column = "utm_json->>'source'";
    } else if (groupBy === 'utm_campaign') {
      column = "utm_json->>'campaign'";
    } else if (groupBy === 'page_url') {
      column = 'page_url';
    } else {
      return res.status(400).json({ error: 'group_by inválido' });
    }

    const result = await db.query(
      `SELECT ${column} AS key, COUNT(*) AS count
       FROM analytics_events
       WHERE ($1::timestamp IS NULL OR created_at >= $1)
         AND ($2::timestamp IS NULL OR created_at <= $2)
       GROUP BY ${column}
       ORDER BY count DESC
       LIMIT 50`,
      [start, end]
    );

    return res.json({ group_by: groupBy, results: result.rows });
  } catch (error) {
    console.error('Erro ao listar traffic admin:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/user/:id/timeline', authenticate, requireAdmin(), async (req, res) => {
  try {
    const userId = req.params.id;
    const eventsResult = await db.query(
      `SELECT id, event_name, page_url, created_at, service_slug, payload_json, utm_json
       FROM analytics_events
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [userId]
    );
    const ordersResult = await db.query(
      `SELECT id, status, amount_cents, currency, created_at, service_slug
       FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    const userResult = await db.query(
      `SELECT id, email, name, utm_first_touch_json, utm_last_touch_json, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const pagesResult = await db.query(
      `SELECT page_url, COUNT(*) AS views
       FROM analytics_events
       WHERE user_id = $1 AND page_url IS NOT NULL
       GROUP BY page_url
       ORDER BY views DESC
       LIMIT 20`,
      [userId]
    );

    return res.json({
      user: userResult.rows[0] || null,
      events: eventsResult.rows,
      orders: ordersResult.rows,
      pages: pagesResult.rows,
    });
  } catch (error) {
    console.error('Erro no timeline admin:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/user/:id/export', authenticate, requireAdmin(), async (req, res) => {
  try {
    const userId = req.params.id;
    const userResult = await db.query(
      `SELECT id, email, name, phone, consent_necessary, consent_analytics, consent_marketing,
              consent_updated_at, utm_first_touch_json, utm_last_touch_json, created_at
       FROM users WHERE id = $1`,
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const ordersResult = await db.query(
      `SELECT id, status, amount_cents, currency, created_at, paid_at, service_slug
       FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    const eventsResult = await db.query(
      `SELECT id, event_name, created_at, page_url, payload_json, utm_json, service_slug
       FROM analytics_events WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    await logAdminAction(req.user.id, 'export_user', 'user', userId, {
      events: eventsResult.rows.length,
      orders: ordersResult.rows.length,
    });

    return res.json({
      user: userResult.rows[0],
      orders: ordersResult.rows,
      events: eventsResult.rows,
    });
  } catch (error) {
    console.error('Erro no export user admin:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/user/:id', authenticate, requireAdmin(), async (req, res) => {
  const client = await db.getClient();
  try {
    const userId = req.params.id;
    await client.query('BEGIN');
    const userResult = await client.query('SELECT id, email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await client.query(
      `UPDATE users
       SET email = $2,
           name = 'Anônimo',
           phone = NULL,
           is_active = false,
           consent_necessary = false,
           consent_analytics = false,
           consent_marketing = false,
           consent_updated_at = NOW(),
           utm_first_touch_json = NULL,
           utm_last_touch_json = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [userId, `deleted+${userId}@anon.local`]
    );

    await client.query(
      `UPDATE profiles
       SET display_name = 'Anônimo', phone = NULL, updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    await client.query(
      `UPDATE orders
       SET customer_name = NULL
       WHERE user_id = $1`,
      [userId]
    );

    await client.query(
      `UPDATE analytics_events
       SET user_id = NULL, payload_json = NULL, utm_json = NULL
       WHERE user_id = $1`,
      [userId]
    );

    await logAdminAction(req.user.id, 'delete_user', 'user', userId, {
      previous_email: userResult.rows[0].email,
    }, client);

    await client.query('COMMIT');
    return res.json({ status: 'anonymized' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao deletar usuário admin:', error);
    return res.status(500).json({ error: 'Erro interno' });
  } finally {
    client.release();
  }
});

const writeCsv = (res, headers, rows) => {
  res.write(`${headers.join(',')}\n`);
  rows.forEach((row) => {
    const line = headers
      .map((header) => {
        const value = row[header] === null || row[header] === undefined ? '' : String(row[header]);
        return `"${value.replace(/"/g, '""')}"`;
      })
      .join(',');
    res.write(`${line}\n`);
  });
};

router.get('/exports/users.csv', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { page, pageSize, offset } = buildPagination(req, 200);
    const result = await db.query(
      `SELECT users.id, users.email, users.name, users.created_at, profiles.role
       FROM users
       LEFT JOIN profiles ON profiles.user_id = users.id
       ORDER BY users.created_at DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    writeCsv(res, ['id', 'email', 'name', 'created_at', 'role'], result.rows);
    await logAdminAction(req.user.id, 'export_users_csv', 'users', null, {
      count: result.rows.length,
    });
    return res.end();
  } catch (error) {
    console.error('Erro ao exportar users:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/exports/orders.csv', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { page, pageSize, offset } = buildPagination(req, 200);
    const result = await db.query(
      `SELECT id, status, amount_cents, currency, created_at, user_id
       FROM orders
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    writeCsv(res, ['id', 'status', 'amount_cents', 'currency', 'created_at', 'user_id'], result.rows);
    await logAdminAction(req.user.id, 'export_orders_csv', 'orders', null, {
      count: result.rows.length,
    });
    return res.end();
  } catch (error) {
    console.error('Erro ao exportar orders:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/exports/events.csv', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { page, pageSize, offset } = buildPagination(req, 200);
    const result = await db.query(
      `SELECT id, session_id, user_id, event_name, page_url, created_at
       FROM analytics_events
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="events.csv"');
    writeCsv(res, ['id', 'session_id', 'user_id', 'event_name', 'page_url', 'created_at'], result.rows);
    await logAdminAction(req.user.id, 'export_events_csv', 'analytics_events', null, {
      count: result.rows.length,
    });
    return res.end();
  } catch (error) {
    console.error('Erro ao exportar events:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
