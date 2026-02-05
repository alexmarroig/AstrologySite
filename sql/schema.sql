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
  role VARCHAR(20) DEFAULT 'user',
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  last_login TIMESTAMP,
  last_login_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  consent_necessary BOOLEAN DEFAULT true,
  consent_analytics BOOLEAN DEFAULT false,
  consent_marketing BOOLEAN DEFAULT false,
  consent_updated_at TIMESTAMP,
  utm_first_touch_json JSONB,
  utm_last_touch_json JSONB,
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  whatsapp VARCHAR(30),
  name VARCHAR(255),
  anonymous_id VARCHAR(100) NOT NULL UNIQUE,
  utm_first_touch_json JSONB,
  utm_last_touch_json JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  phone VARCHAR(20),
  locale VARCHAR(10) DEFAULT 'pt-BR',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  price_cents INTEGER NOT NULL,
  delivery_days_min INTEGER NOT NULL,
  delivery_days_max INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
  service_slug VARCHAR(50),
  order_number VARCHAR(50) UNIQUE,
  service_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'requested',
  service_data JSONB,
  amount NUMERIC(10, 2),
  currency VARCHAR(3) DEFAULT 'BRL',
  price NUMERIC(10, 2),
  amount_cents INTEGER,
  payment_provider VARCHAR(100),
  payment_id VARCHAR(255),
  session_id VARCHAR(100),
  referrer TEXT,
  landing_page TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(150),
  utm_content VARCHAR(150),
  utm_term VARCHAR(150),
  customer_name VARCHAR(255),
  birth_date DATE,
  birth_time VARCHAR(20),
  birth_place_text VARCHAR(255),
  birth_lat NUMERIC(10, 6),
  birth_lng NUMERIC(10, 6),
  timezone_offset INTEGER,
  language VARCHAR(10),
  notes TEXT,
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

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_payment_id VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  amount_cents INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  raw_json JSONB
);

CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id VARCHAR(100) PRIMARY KEY,
  first_seen_at TIMESTAMP NOT NULL,
  last_seen_at TIMESTAMP NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(150),
  utm_content VARCHAR(150),
  utm_term VARCHAR(150),
  landing_page TEXT,
  device VARCHAR(100),
  country VARCHAR(100),
  ip_hash VARCHAR(255) NOT NULL,
  user_agent TEXT,
  consent_analytics BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  event_name TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  anonymous_id VARCHAR(100),
  session_id VARCHAR(100),
  page_url TEXT,
  referrer TEXT,
  service_slug VARCHAR(50),
  payload_json JSONB,
  utm_json JSONB,
  ip_hash VARCHAR(255),
  user_agent TEXT,
  consent_analytics BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS analytics_events_event_name_idx ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS analytics_events_anonymous_id_idx ON analytics_events(anonymous_id);
CREATE INDEX IF NOT EXISTS analytics_events_service_slug_idx ON analytics_events(service_slug);

CREATE INDEX IF NOT EXISTS leads_anonymous_id_idx ON leads(anonymous_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(100) NOT NULL,
  target_id VARCHAR(100),
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  meta_json JSONB
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
CREATE INDEX IF NOT EXISTS idx_orders_service_id ON orders(service_id);
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_analysis_cache_hash ON analysis_cache(birth_data_hash);
CREATE INDEX IF NOT EXISTS idx_analysis_cache_type ON analysis_cache(analysis_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_order_id ON email_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user_id ON analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_first_seen ON analytics_sessions(first_seen_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_ts ON analytics_events(ts);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user_id ON audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ts ON audit_logs(ts);
