const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { newDb } = require('pg-mem');

const createTestPool = () => {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  const schemaPath = path.join(__dirname, '../../sql/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.public.none(schemaSql);
  const adapter = db.adapters.createPg();
  return new adapter.Pool();
};

const pool =
  process.env.NODE_ENV === 'test'
    ? createTestPool()
    : new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      });

pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
