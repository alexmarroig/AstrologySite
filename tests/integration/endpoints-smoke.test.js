const { before, test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const scenarios = require('./endpoints.config');

process.env.JWT_SECRET = 'test-secret';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@astrolumen.com';

const app = require('../../src/app');
const db = require('../../src/db');

const userToken = jwt.sign({ id: 1, email: 'user@astrolumen.com', role: 'user' }, process.env.JWT_SECRET);
const adminToken = jwt.sign(
  { id: 2, email: process.env.ADMIN_EMAIL, role: 'admin' },
  process.env.JWT_SECRET
);

before(async () => {
  await db.query(
    `INSERT INTO users (id, email, name, role, password_hash, consent_analytics)
     VALUES
      (1, 'user@astrolumen.com', 'User Test', 'user', 'hash', true),
      (2, 'admin@astrolumen.com', 'Admin Test', 'admin', 'hash', true)
     ON CONFLICT (id) DO NOTHING`
  );

  await db.query(
    `INSERT INTO profiles (user_id, display_name, role)
     VALUES (1, 'User Test', 'user'), (2, 'Admin Test', 'admin')
     ON CONFLICT (user_id) DO NOTHING`
  );

  await db.query(
    `INSERT INTO services (id, slug, name, price_cents, delivery_days_min, delivery_days_max, active)
     VALUES (1, 'mapa-natal', 'Mapa Natal', 19900, 3, 5, true)
     ON CONFLICT (id) DO NOTHING`
  );
});

for (const scenario of scenarios) {
  test(`${scenario.method.toUpperCase()} ${scenario.path}`, async () => {
    let req = request(app)[scenario.method](scenario.path);

    if (scenario.auth === 'user') {
      req = req.set('Authorization', `Bearer ${userToken}`);
    } else if (scenario.auth === 'admin') {
      req = req.set('Authorization', `Bearer ${adminToken}`);
    }

    if (scenario.body) {
      req = req.send(scenario.body);
    }

    const response = await req;
    assert.ok(
      scenario.expected.includes(response.status),
      `status ${response.status} não esperado para ${scenario.method.toUpperCase()} ${scenario.path}`
    );
  });
}

test('registra user_action para usuário autenticado', async () => {
  await request(app).get('/api/orders').set('Authorization', `Bearer ${userToken}`).expect(200);

  const result = await db.query(
    `SELECT event_name, user_id, page_url, payload_json
     FROM analytics_events
     WHERE user_id = 1 AND event_name = 'user_action'
     ORDER BY created_at DESC
     LIMIT 1`
  );

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].event_name, 'user_action');
  assert.equal(result.rows[0].user_id, 1);
  assert.equal(result.rows[0].page_url, '/api/orders');
  assert.equal(result.rows[0].payload_json.method, 'GET');
});
