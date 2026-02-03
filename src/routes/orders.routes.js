const express = require('express');
const Stripe = require('stripe');

const authMiddleware = require('../auth/auth.middleware');
const db = require('../db');
const emailService = require('../services/email.service');
const reportQueue = require('../queues/report.queue');
const { getPricing } = require('../services/pricing.service');
const { generateReportForOrder } = require('../reports/reportService');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const buildOrderNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `ORD-${year}-${random}`;
};

const serviceLabel = (serviceType) => {
  const labels = {
    natal_chart: 'Mapa Natal',
    solar_return: 'Retorno Solar',
    synastry: 'Sinastria',
    predictions: 'Previsões',
  };
  return labels[serviceType] || serviceType;
};

const formatCurrency = (amount, currency) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency || 'BRL',
  }).format(amount);

const buildBirthSummary = (serviceData = {}) => {
  if (serviceData.person1 && serviceData.person2) {
    return `Pessoa 1: ${serviceData.person1.birth_date || serviceData.person1.birthDate}
Pessoa 2: ${serviceData.person2.birth_date || serviceData.person2.birthDate}`;
  }
  return `Data nascimento: ${serviceData.birth_date || serviceData.birthDate}
Hora: ${serviceData.birth_time || serviceData.birthTime || '12:00'}
Local: ${serviceData.birth_location || serviceData.birthLocation}`;
};

const buildAdminLink = (orderId) =>
  `${process.env.ADMIN_DASHBOARD_URL || ''}/orders/${orderId}/complete`;

const calculateEstimatedCompletion = (paidAt) => {
  if (!paidAt) return null;
  const date = new Date(paidAt);
  date.setDate(date.getDate() + 3);
  return date;
};

router.post('/', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const { service_type: serviceType, service_data: serviceData, analysis_id: analysisId } =
      req.body;

    if (!serviceType || !serviceData) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const pricing = getPricing(serviceType);
    if (!pricing) {
      return res.status(400).json({ error: 'Serviço não encontrado' });
    }

    let orderNumber = buildOrderNumber();
    let orderResult;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        orderResult = await db.query(
          `INSERT INTO orders
            (user_id, order_number, service_type, service_data, status, amount, currency, amount_cents, analysis_id, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() + interval '20 minutes')
           RETURNING id, order_number`,
          [
            req.user.id,
            orderNumber,
            serviceType,
            JSON.stringify(serviceData),
            'pending',
            pricing.price,
            pricing.currency,
            Math.round(pricing.price * 100),
            analysisId || null,
          ]
        );
        break;
      } catch (error) {
        if (error.code === '23505') {
          orderNumber = buildOrderNumber();
        } else {
          throw error;
        }
      }
    }

    const orderId = orderResult.rows[0].id;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: pricing.currency.toLowerCase(),
            unit_amount: Math.round(pricing.price * 100),
            product_data: {
              name: pricing.description,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        order_id: orderId,
        user_id: req.user.id,
        service_type: serviceType,
      },
      success_url: `${process.env.FRONTEND_URL}/orders/${orderId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/orders/${orderId}/cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 20 * 60,
    });

    await db.query(
      'UPDATE orders SET stripe_session_id = $1 WHERE id = $2',
      [session.id, orderId]
    );

    return res.status(201).json({
      order_id: orderId,
      order_number: orderResult.rows[0].order_number,
      service_type: serviceType,
      amount: pricing.price,
      currency: pricing.currency,
      status: 'pending',
      stripe_session_url: session.url,
      expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/:orderId/success', async (req, res) => {
  try {
    const { orderId } = req.params;
    const sessionId = req.query.session_id || req.body.session_id;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID ausente' });
    }

    const orderResult = await db.query(
      'SELECT * FROM orders WHERE id = $1 LIMIT 1',
      [orderId]
    );
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.id !== order.stripe_session_id) {
      return res.status(400).json({ error: 'Sessão não corresponde ao pedido' });
    }

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Pagamento ainda não confirmado' });
    }

    await db.query(
      `UPDATE orders
       SET status = $1, paid_at = NOW(), stripe_payment_id = $2, updated_at = NOW()
       WHERE id = $3`,
      ['processing', session.payment_intent, orderId]
    );

    await reportQueue.add('generate-report', {
      order_id: orderId,
      user_id: order.user_id,
      service_type: order.service_type,
      service_data: order.service_data,
    });

    return res.json({
      order_id: orderId,
      order_number: order.order_number,
      status: 'processing',
      message: 'Pedido confirmado! Gerando seu relatório...',
      next_steps: {
        step: 'Relatório em processamento',
        description: 'Seu mapa está sendo calculado',
        estimated_time: '3-5 dias úteis',
      },
    });
  } catch (error) {
    console.error('Erro ao confirmar pedido:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const statusFilter = req.query.status;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const sort = req.query.sort === '-created_at' ? 'DESC' : 'ASC';

    const whereClause = statusFilter ? 'AND status = $2' : '';
    const params = statusFilter ? [req.user.id, statusFilter] : [req.user.id];

    const ordersResult = await db.query(
      `SELECT *
       FROM orders
       WHERE user_id = $1 ${whereClause}
       ORDER BY created_at ${sort}
       LIMIT $${statusFilter ? 3 : 2} OFFSET $${statusFilter ? 4 : 3}`,
      statusFilter ? [...params, limit, offset] : [...params, limit, offset]
    );

    const totalResult = await db.query(
      `SELECT COUNT(*) FROM orders WHERE user_id = $1 ${whereClause}`,
      params
    );
    const total = Number(totalResult.rows[0].count);

    const orders = ordersResult.rows.map((order) => {
      const estimatedCompletion = calculateEstimatedCompletion(order.paid_at);
      const daysRemaining = estimatedCompletion
        ? Math.ceil((estimatedCompletion - new Date()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        id: order.id,
        order_number: order.order_number,
        service_type: order.service_type,
        amount: order.amount,
        status: order.status,
        created_at: order.created_at,
        paid_at: order.paid_at,
        completed_at: order.completed_at,
        estimated_completion: estimatedCompletion,
        days_remaining: daysRemaining,
        service_data: order.service_data,
        email_sent_to_client: order.email_sent_to_client,
        report_url: order.report_url,
      };
    });

    return res.json({
      orders,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/:orderId', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Pedido de outro usuário' });
    }

    const estimatedCompletion = calculateEstimatedCompletion(order.paid_at);
    const daysRemaining = estimatedCompletion
      ? Math.ceil((estimatedCompletion - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    return res.json({
      id: order.id,
      order_number: order.order_number,
      service_type: order.service_type,
      amount: order.amount,
      status: order.status,
      created_at: order.created_at,
      paid_at: order.paid_at,
      completed_at: order.completed_at,
      estimated_completion: estimatedCompletion,
      days_remaining: daysRemaining,
      service_data: order.service_data,
      report_url: order.report_url,
      timeline: [
        {
          event: 'Pedido criado',
          date: order.created_at,
          status: 'completed',
        },
        {
          event: 'Pagamento recebido',
          date: order.paid_at,
          status: order.paid_at ? 'completed' : 'pending',
        },
        {
          event: 'Relatório em processamento',
          date: order.paid_at,
          status: order.status === 'processing' ? 'in_progress' : 'pending',
        },
        {
          event: 'Análise por Camila',
          date: order.completed_at,
          status: order.completed_at ? 'completed' : 'pending',
          estimated: estimatedCompletion,
        },
        {
          event: 'Relatório entregue',
          date: order.completed_at,
          status: order.completed_at ? 'completed' : 'pending',
        },
      ],
    });
  } catch (error) {
    console.error('Erro ao detalhar pedido:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/:orderId/complete', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token || token !== ADMIN_TOKEN) {
      return res.status(403).json({ error: 'Não é admin' });
    }

    const { orderId } = req.params;
    const orderResult = await db.query(
      `SELECT orders.*, users.email, users.name, users.phone
       FROM orders
       JOIN users ON users.id = orders.user_id
       WHERE orders.id = $1`,
      [orderId]
    );
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    if (order.status === 'completed') {
      return res.status(400).json({ error: 'Pedido já completo' });
    }

    let reportUrl = order.report_url;
    if (!reportUrl) {
      const generated = await generateReportForOrder(order);
      reportUrl = generated.reportUrl;
    }

    await db.query(
      `UPDATE orders
       SET status = $1, completed_at = NOW(), email_sent_to_client = true, email_sent_at_client = NOW()
       WHERE id = $2`,
      ['completed', orderId]
    );

    const pricing = getPricing(order.service_type);
    const reportLink = reportUrl || 'Relatório em processamento.';

    const dashboardUrl = `${process.env.FRONTEND_URL || ''}/dashboard`;
    await emailService.sendClientCompletionEmail({
      to: order.email,
      clientName: order.name,
      serviceLabel: serviceLabel(order.service_type),
      orderNumber: order.order_number,
      reportUrl: reportLink,
      dashboardUrl,
    });

    await db.query(
      `INSERT INTO email_logs (order_id, recipient_email, recipient_type, subject, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        orderId,
        order.email,
        'client',
        `✨ Sua análise astrológica está pronta! - Pedido #${order.order_number}`,
        'sent',
      ]
    );

    return res.json({
      order_id: orderId,
      status: 'completed',
      completed_at: new Date().toISOString(),
      email_sent_to_client: true,
      message: 'Pedido marcado como completo. Email enviado para cliente.',
      service_price: pricing ? formatCurrency(pricing.price, pricing.currency) : null,
    });
  } catch (error) {
    console.error('Erro ao completar pedido:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/:orderId/notify-astrologer', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderResult = await db.query(
      `SELECT orders.*, users.email, users.name, users.phone
       FROM orders
       JOIN users ON users.id = orders.user_id
       WHERE orders.id = $1`,
      [orderId]
    );
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Pedido de outro usuário' });
    }

    const pricing = getPricing(order.service_type);
    const adminEmail = process.env.SENDGRID_ASTROLOGER_EMAIL || process.env.EMAIL_USER;

    await emailService.sendAstrologerOrderEmail({
      to: adminEmail,
      orderNumber: order.order_number,
      clientName: order.name,
      clientEmail: order.email,
      clientPhone: order.phone,
      serviceLabel: serviceLabel(order.service_type),
      servicePrice: pricing ? formatCurrency(pricing.price, pricing.currency) : '',
      orderDate: new Date(order.created_at).toLocaleString('pt-BR'),
      birthDataSummary: buildBirthSummary(order.service_data),
      adminLink: buildAdminLink(order.id),
      reportUrl: order.report_url,
    });

    await db.query(
      `UPDATE orders
       SET email_sent_to_astrologer = true, email_sent_at = NOW()
       WHERE id = $1`,
      [orderId]
    );

    await db.query(
      `INSERT INTO email_logs (order_id, recipient_email, recipient_type, subject, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        orderId,
        adminEmail,
        'astrologer',
        `[NOVO] ${serviceLabel(order.service_type)} - ${order.name} - Pedido #${order.order_number}`,
        'sent',
      ]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Erro ao notificar astróloga:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
