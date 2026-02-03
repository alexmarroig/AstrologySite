const express = require('express');
const Stripe = require('stripe');
const db = require('../../db');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

router.post('/stripe/checkout', authenticate, async (req, res) => {
  try {
    const { order_id: orderId } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ error: 'order_id obrigatório' });
    }

    const orderResult = await db.query(
      `SELECT orders.id, orders.user_id, orders.amount_cents, orders.currency, services.name AS service_name
       FROM orders
       LEFT JOIN services ON services.id = orders.service_id
       WHERE orders.id = $1`,
      [orderId]
    );
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    if (order.user_id && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    if (!order.amount_cents) {
      return res.status(400).json({ error: 'Pedido sem valor definido' });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (order.currency || 'BRL').toLowerCase(),
            product_data: {
              name: order.service_name || 'Serviço AstroLumen',
            },
            unit_amount: order.amount_cents,
          },
        },
      ],
      client_reference_id: String(order.id),
      success_url: process.env.STRIPE_SUCCESS_URL || 'https://astrolumen.com/checkout/success',
      cancel_url: process.env.STRIPE_CANCEL_URL || 'https://astrolumen.com/checkout/cancel',
      metadata: {
        orderId: order.id,
        userId: req.user.id,
      },
    });

    await db.query('UPDATE orders SET stripe_session_id = $1, status = $2 WHERE id = $3', [
      checkoutSession.id,
      'pending',
      order.id,
    ]);

    await db.query(
      'INSERT INTO payments (order_id, provider, provider_payment_id, status, amount_cents) VALUES ($1, $2, $3, $4, $5)',
      [order.id, 'stripe', checkoutSession.id, 'created', order.amount_cents]
    );

    return res.json({ checkout_url: checkoutSession.url });
  } catch (error) {
    console.error('Erro no checkout Stripe:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/stripe/webhook', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook Stripe inválido:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata && session.metadata.orderId;
      if (orderId) {
        await db.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [
          'paid',
          orderId,
        ]);
        await db.query(
          'INSERT INTO payments (order_id, provider, provider_payment_id, status, amount_cents, raw_json) VALUES ($1, $2, $3, $4, $5, $6)',
          [orderId, 'stripe', session.payment_intent || session.id, 'paid', session.amount_total, session]
        );
      }
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      const orderId = charge.metadata && charge.metadata.orderId;
      if (orderId) {
        await db.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [
          'refunded',
          orderId,
        ]);
        await db.query(
          'INSERT INTO payments (order_id, provider, provider_payment_id, status, amount_cents, raw_json) VALUES ($1, $2, $3, $4, $5, $6)',
          [orderId, 'stripe', charge.id, 'refunded', charge.amount_refunded, charge]
        );
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook Stripe:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
