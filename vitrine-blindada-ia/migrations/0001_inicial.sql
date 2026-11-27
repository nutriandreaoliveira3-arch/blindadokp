-- Vitrine Blindada IA — banco D1 (Cloudflare)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  pass_hash TEXT NOT NULL,
  pass_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'assinante', -- 'admin' | 'assinante'
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Acesso por e-mail de compra. Atualizado pelo webhook da Greenn ou manualmente pela administradora.
CREATE TABLE IF NOT EXISTS subscriptions (
  email TEXT PRIMARY KEY,
  active INTEGER NOT NULL DEFAULT 0,
  status TEXT,          -- último status recebido (paid, canceled, refunded...)
  source TEXT,          -- 'greenn' | 'manual'
  ref TEXT,             -- id da venda/contrato
  product TEXT,
  updated_at TEXT NOT NULL
);

-- Todo aviso recebido da Greenn fica guardado (a Greenn não mostra esse histórico no painel).
CREATE TABLE IF NOT EXISTS webhook_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at TEXT NOT NULL,
  email TEXT,
  status TEXT,
  action TEXT,          -- 'liberado' | 'bloqueado' | 'ignorado' | 'erro'
  payload TEXT NOT NULL
);

-- Dados do app. owner = id da usuária, ou '__global__' para a base de políticas.
CREATE TABLE IF NOT EXISTS docs (
  owner TEXT NOT NULL,
  store TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner, store, id)
);

CREATE TABLE IF NOT EXISTS meta (
  owner TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (owner, key)
);

-- Uso da IA por mês (limite por plano)
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id TEXT NOT NULL,
  month TEXT NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);
