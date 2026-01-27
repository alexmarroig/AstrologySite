const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/analysis', require('./src/routes/analysis.routes'));
app.use('/api/payments', require('./src/routes/payment.routes'));
app.use('/api/newsletter', require('./src/routes/newsletter.routes'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend rodando' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
});
