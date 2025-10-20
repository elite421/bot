-- PostgreSQL schema for ReverseOTP (direct pg client)
-- Safe to run multiple times (uses IF NOT EXISTS and adds indexes idempotently)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  name TEXT,
  password TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user',
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_requests (
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  hash_code TEXT NOT NULL,
  qr_code_data TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS idx_login_requests_phone ON login_requests(phone);
CREATE INDEX IF NOT EXISTS idx_login_requests_expires_at ON login_requests(expires_at);

CREATE TABLE IF NOT EXISTS otp_requests (
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  consumed BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS idx_otp_requests_phone ON otp_requests(phone);
CREATE INDEX IF NOT EXISTS idx_otp_requests_expires_at ON otp_requests(expires_at);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  auth_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Request-tracking sessions used by UI (not auth tokens)
CREATE TABLE IF NOT EXISTS prisma_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip TEXT,
  user_agent TEXT,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prisma_sessions_user_id ON prisma_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_prisma_sessions_created_at ON prisma_sessions(created_at);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notify_whatsapp BOOLEAN DEFAULT TRUE,
  notify_email BOOLEAN,
  login_alerts BOOLEAN,
  compact_mode BOOLEAN,
  language TEXT,
  session_expire INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  type TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type)
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

CREATE TABLE IF NOT EXISTS webhook_tokens (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

CREATE TABLE IF NOT EXISTS packages (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  credit_amount INT NOT NULL,
  price_cents INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id INT NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  status TEXT NOT NULL,
  credits_purchased INT NOT NULL,
  method TEXT NOT NULL,
  amount_cents INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_tx_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_package_id ON payment_transactions(package_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON payment_transactions(status);

CREATE TABLE IF NOT EXISTS auth_credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_credit_tx_user_id ON auth_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_credit_tx_type ON auth_credit_transactions(type);

-- Contact messages submitted from the Contact page
CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  -- Store normalized phone as digits with country code (e.g., 91XXXXXXXXXX)
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_messages_phone ON contact_messages(phone);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at);

-- Organizations and related structures
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_user_id);

CREATE TABLE IF NOT EXISTS organization_users (
  organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner' | 'admin' | 'member'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON organization_users(user_id);

CREATE TABLE IF NOT EXISTS org_groups (
  id SERIAL PRIMARY KEY,
  organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_groups_org_id ON org_groups(organization_id);

CREATE TABLE IF NOT EXISTS org_group_members (
  id SERIAL PRIMARY KEY,
  group_id INT NOT NULL REFERENCES org_groups(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_group_members_group_id ON org_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_org_group_members_user_id ON org_group_members(user_id);

CREATE TABLE IF NOT EXISTS org_api_tokens (
  id SERIAL PRIMARY KEY,
  organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, token)
);
CREATE INDEX IF NOT EXISTS idx_org_api_tokens_org_id ON org_api_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_api_tokens_active ON org_api_tokens(active);

CREATE TABLE IF NOT EXISTS org_auth_credit_transactions (
  id SERIAL PRIMARY KEY,
  organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'credit' | 'debit'
  amount INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_credit_tx_org_id ON org_auth_credit_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_credit_tx_type ON org_auth_credit_transactions(type);

CREATE TABLE IF NOT EXISTS org_usages (
  id SERIAL PRIMARY KEY,
  organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  login_request_id INT NOT NULL REFERENCES login_requests(id) ON DELETE CASCADE,
  cost INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, login_request_id)
);
CREATE INDEX IF NOT EXISTS idx_org_usages_org_id ON org_usages(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_usages_login_request_id ON org_usages(login_request_id);
