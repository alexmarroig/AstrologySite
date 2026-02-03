const db = require('../db');

const services = [
  {
    slug: 'mapa-natal',
    name: 'Mapa Natal',
    price_cents: 12900,
    delivery_days_min: 3,
    delivery_days_max: 7,
  },
  {
    slug: 'revolucao-solar',
    name: 'Revolução Solar',
    price_cents: 14900,
    delivery_days_min: 3,
    delivery_days_max: 7,
  },
  {
    slug: 'sinastria',
    name: 'Sinastria',
    price_cents: 16900,
    delivery_days_min: 4,
    delivery_days_max: 8,
  },
  {
    slug: 'previsoes',
    name: 'Previsões',
    price_cents: 9900,
    delivery_days_min: 2,
    delivery_days_max: 5,
  },
  {
    slug: 'progressoes',
    name: 'Progressões',
    price_cents: 17900,
    delivery_days_min: 4,
    delivery_days_max: 9,
  },
];

const seed = async () => {
  try {
    for (const service of services) {
      await db.query(
        `INSERT INTO services (slug, name, price_cents, delivery_days_min, delivery_days_max, active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           price_cents = EXCLUDED.price_cents,
           delivery_days_min = EXCLUDED.delivery_days_min,
           delivery_days_max = EXCLUDED.delivery_days_max,
           active = true`,
        [
          service.slug,
          service.name,
          service.price_cents,
          service.delivery_days_min,
          service.delivery_days_max,
        ]
      );
    }
    console.log('✅ Serviços seed concluído');
  } catch (error) {
    console.error('Erro ao seed services:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

seed();
