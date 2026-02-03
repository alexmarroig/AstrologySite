const { test } = require('node:test');

if (process.env.RUN_INTEGRATION_TESTS !== 'true') {
  test('integration tests skipped (set RUN_INTEGRATION_TESTS=true)', { skip: true }, () => {});
  return;
}

const assert = require('node:assert/strict');
const request = require('supertest');

process.env.JWT_SECRET = 'test-secret';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

const app = require('../../src/app');

test('responde health check', async () => {
  const response = await request(app).get('/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});
