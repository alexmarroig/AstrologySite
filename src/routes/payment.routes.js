const express = require('express');
const Stripe = require('stripe');

const authMiddleware = require('../auth/auth.middleware');
const db = require('../db');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

router.post('/intent', authMiddleware.authenticateToken, async (req, res) => {
  try {
    const { amountCents, serviceType } = req.body;
    if (!amountCents || !serviceType) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'brl',
      metadata: {
        userId: req.user.id,
        serviceType,
      },
    });

    const orderResult = await db.query(
      'INSERT INTO orders (user_id, service_type, status, amount_cents, stripe_payment_intent_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [req.user.id, serviceType, 'pending', amountCents, paymentIntent.id]
    );

    return res.json({
      orderId: orderResult.rows[0].id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Erro ao criar payment intent:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
