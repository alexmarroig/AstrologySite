const db = require('../db');

const retentionDays = Number(process.env.ANALYTICS_RETENTION_DAYS || 90);

const prune = async () => {
  try {
    const result = await db.query(
      'DELETE FROM analytics_events WHERE created_at < NOW() - ($1::text || \' days\')::interval',
      [retentionDays]
    );
    await db.query(
      'DELETE FROM analytics_sessions WHERE last_seen_at < NOW() - ($1::text || \' days\')::interval',
      [retentionDays]
    );
    console.log(`✅ Analytics prune: ${result.rowCount} events removidos`);
  } catch (error) {
    console.error('Erro ao remover analytics antigos:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

prune();
