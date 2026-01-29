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
  phone VARCHAR(20),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  order_number VARCHAR(50) UNIQUE,
  service_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  service_data JSONB,
  amount NUMERIC(10, 2),
  currency VARCHAR(3) DEFAULT 'BRL',
  amount_cents INTEGER,
  stripe_payment_intent_id VARCHAR(255),
  stripe_session_id VARCHAR(255),
  stripe_payment_id VARCHAR(255),
  analysis_id VARCHAR(255),
  report_url VARCHAR(500),
  report_file_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,
  email_sent_to_astrologer BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  email_sent_to_client BOOLEAN DEFAULT false,
  email_sent_at_client TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

CREATE TABLE IF NOT EXISTS analysis_cache (
  id SERIAL PRIMARY KEY,
  birth_data_hash VARCHAR(255) UNIQUE NOT NULL,
  analysis_type VARCHAR(50) NOT NULL,
  ephemeris_data JSONB NOT NULL,
  houses_data JSONB NOT NULL,
  aspects_data JSONB NOT NULL,
  interpretations JSONB NOT NULL,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  failure_reason VARCHAR(500)
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
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON orders(expires_at);
CREATE INDEX IF NOT EXISTS idx_analysis_cache_hash ON analysis_cache(birth_data_hash);
CREATE INDEX IF NOT EXISTS idx_analysis_cache_type ON analysis_cache(analysis_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_order_id ON email_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
