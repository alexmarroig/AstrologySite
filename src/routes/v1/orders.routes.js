const express = require('express');
const db = require('../../db');
const { authenticate, optionalAuth, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

const allowedStatuses = new Set(['draft', 'pending', 'paid', 'cancelled', 'refunded']);

router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      service_id: serviceId,
      session_id: sessionId,
      utm,
      referrer,
      landing_page: landingPage,
      customer_name: customerName,
      birth_date: birthDate,
      birth_time: birthTime,
      birth_place_text: birthPlaceText,
      birth_lat: birthLat,
      birth_lng: birthLng,
      timezone_offset: timezoneOffset,
      language,
      notes,
    } = req.body || {};

    if (!serviceId || !customerName || !birthDate || !birthTime || !birthPlaceText) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const serviceResult = await db.query(
      'SELECT id, name, price_cents FROM services WHERE id = $1 AND active = true',
      [serviceId]
    );
    const service = serviceResult.rows[0];
    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    const result = await db.query(
      `INSERT INTO orders
      (user_id, service_id, service_type, status, amount_cents, currency, session_id, referrer, landing_page,
       utm_source, utm_medium, utm_campaign, utm_content, utm_term,
       customer_name, birth_date, birth_time, birth_place_text, birth_lat, birth_lng, timezone_offset, language, notes)
      VALUES
      ($1, $2, $3, 'draft', $4, 'BRL', $5, $6, $7,
       $8, $9, $10, $11, $12,
       $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING id, status`,
      [
        req.user ? req.user.id : null,
        service.id,
        service.name,
        service.price_cents,
        sessionId || null,
        referrer || null,
        landingPage || null,
        utm && utm.source ? utm.source : null,
        utm && utm.medium ? utm.medium : null,
        utm && utm.campaign ? utm.campaign : null,
        utm && utm.content ? utm.content : null,
        utm && utm.term ? utm.term : null,
        customerName,
        birthDate,
        birthTime,
        birthPlaceText,
        birthLat || null,
        birthLng || null,
        timezoneOffset || null,
        language || 'pt-BR',
        notes || null,
      ]
    );

    return res.status(201).json({ order_id: result.rows[0].id, status: result.rows[0].status });
  } catch (error) {
    console.error('Erro ao criar order:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const orderId = req.params.id;
    const result = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = result.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    return res.json(order);
  } catch (error) {
    console.error('Erro ao buscar order:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.patch('/:id/status', authenticate, requireAdmin(), async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body || {};
    if (!status || !allowedStatuses.has(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const result = await db.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status',
      [status, orderId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    await db.query(
      'INSERT INTO audit_logs (admin_user_id, action, target_type, target_id, meta_json) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'order_status_update', 'order', orderId, { status }]
    );

    return res.json({ id: result.rows[0].id, status: result.rows[0].status });
  } catch (error) {
    console.error('Erro ao atualizar status order:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
