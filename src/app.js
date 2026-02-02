const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/analysis', require('./routes/analysis.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/orders', require('./routes/orders.routes'));
app.use('/api/newsletter', require('./routes/newsletter.routes'));

app.use('/', require('./routes/content.routes'));

app.get('/openapi.json', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'openapi.json'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend rodando' });
});

module.exports = app;
