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

router.get('/users', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { query } = req.query;
    const { page, pageSize, offset } = buildPagination(req, 20);
    const search = query ? `%${query.toLowerCase()}%` : null;

    const result = await db.query(
      `SELECT users.id, users.email, users.name, users.created_at, profiles.role
       FROM users
       LEFT JOIN profiles ON profiles.user_id = users.id
       WHERE ($1::text IS NULL OR LOWER(users.email) LIKE $1 OR LOWER(users.name) LIKE $1)
       ORDER BY users.created_at DESC
       LIMIT $2 OFFSET $3`,
      [search, pageSize, offset]
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
      `SELECT event_name, page, ts FROM analytics_events WHERE user_id = $1 ORDER BY ts DESC LIMIT 50`,
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
    const { status, service, from, to } = req.query;
    const { page, pageSize, offset } = buildPagination(req, 20);
    const start = from ? new Date(from) : null;
    const end = to ? new Date(to) : null;

    const result = await db.query(
      `SELECT orders.id, orders.status, orders.amount_cents, orders.currency, orders.created_at, services.name AS service_name
       FROM orders
       LEFT JOIN services ON services.id = orders.service_id
       WHERE ($1::text IS NULL OR orders.status = $1)
         AND ($2::text IS NULL OR services.slug = $2)
         AND ($3::timestamp IS NULL OR orders.created_at >= $3)
         AND ($4::timestamp IS NULL OR orders.created_at <= $4)
       ORDER BY orders.created_at DESC
       LIMIT $5 OFFSET $6`,
      [status || null, service || null, start, end, pageSize, offset]
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
      `SELECT id, session_id, user_id, event_name, page, ts
       FROM analytics_events
       ORDER BY ts DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="events.csv"');
    writeCsv(res, ['id', 'session_id', 'user_id', 'event_name', 'page', 'ts'], result.rows);
    return res.end();
  } catch (error) {
    console.error('Erro ao exportar events:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
