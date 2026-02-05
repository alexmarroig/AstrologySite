const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeContentStore } = require('./content/contentStore');
require('dotenv').config();

const app = express();

initializeContentStore();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use('/v1/payments/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/analysis', require('./routes/analysis.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/orders', require('./routes/orders.routes'));
app.use('/api/newsletter', require('./routes/newsletter.routes'));
app.use('/api/admin', require('./routes/admin-content.routes'));
app.use('/api/admin', require('./routes/admin-reports.routes'));

app.use('/', require('./routes/content.routes'));
app.use('/api/content', require('./routes/content-api.routes'));
app.use('/api/horoscope', require('./routes/horoscope.routes'));
app.use('/api/admin', require('./routes/admin/content.routes'));
app.use('/api/admin', require('./routes/admin/reports.routes'));

app.use('/v1/analytics', require('./routes/v1/analytics.routes'));
app.use('/v1', require('./routes/v1/tracking.routes'));
app.use('/v1/services', require('./routes/v1/services.routes'));
app.use('/v1/orders', require('./routes/v1/orders.routes'));
app.use('/v1/payments', require('./routes/v1/payments.routes'));
app.use('/v1/auth', require('./routes/v1/auth.routes'));
app.use('/v1/admin', require('./routes/v1/admin.routes'));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/openapi.json', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'openapi.json'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend rodando' });
});

module.exports = app;
