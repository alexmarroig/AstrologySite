-- ===== TABELAS DE INTERPRETAÇÕES ASTROLÓGICAS =====

CREATE TABLE IF NOT EXISTS planet_sign_interpretations (
  id SERIAL PRIMARY KEY,
  planet VARCHAR(20) NOT NULL,
  sign VARCHAR(20) NOT NULL,
  interpretation TEXT NOT NULL,
  keywords VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(planet, sign)
);

CREATE TABLE IF NOT EXISTS aspect_interpretations (
  id SERIAL PRIMARY KEY,
  planet1 VARCHAR(20) NOT NULL,
  planet2 VARCHAR(20) NOT NULL,
  aspect_type VARCHAR(20) NOT NULL,
  interpretation TEXT NOT NULL,
  quality VARCHAR(20),
  keywords VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(planet1, planet2, aspect_type)
);

CREATE TABLE IF NOT EXISTS house_sign_interpretations (
  id SERIAL PRIMARY KEY,
  house_number INT NOT NULL,
  sign VARCHAR(20) NOT NULL,
  interpretation TEXT NOT NULL,
  keywords VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(house_number, sign)
);

-- ===== TABELAS DO SISTEMA =====

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  service_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  amount_cents INTEGER,
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analyses (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50),
  ephemeris_data JSONB,
  llm_analysis TEXT,
  report_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- ===== ÍNDICES PARA PERFORMANCE =====

CREATE INDEX IF NOT EXISTS idx_planet_sign ON planet_sign_interpretations(planet, sign);
CREATE INDEX IF NOT EXISTS idx_aspect ON aspect_interpretations(planet1, planet2, aspect_type);
CREATE INDEX IF NOT EXISTS idx_house_sign ON house_sign_interpretations(house_number, sign);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
