-- Blindada Intelligence v2 — esquema do banco (Cloudflare D1 / SQLite)
-- Regras: só dados com fonte conhecida; nada de saúde, peso, aparência ou renda inferida.

CREATE TABLE IF NOT EXISTS leads (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nome            TEXT NOT NULL,
  cargo           TEXT,
  profissao       TEXT,
  empresa         TEXT,
  site_empresa    TEXT,
  porte           TEXT,              -- '1-10', '11-50', '51-200', '200+'
  anos_atuacao    INTEGER,
  cidade          TEXT,
  uf              TEXT,
  instagram       TEXT,
  linkedin        TEXT,
  email           TEXT,              -- e-mail profissional publicado
  whatsapp        TEXT,              -- telefone/WhatsApp profissional publicado
  contato_direto  INTEGER DEFAULT 0, -- 1 = contato comprovadamente da própria pessoa
  fonte_url       TEXT,              -- onde os dados foram encontrados
  fonte_desc      TEXT,              -- o que a fonte comprova
  origem          TEXT DEFAULT 'manual', -- manual | busca | importacao | instagram | indicacao
  etapa           TEXT DEFAULT 'Novo lead',
  motivo_perda    TEXT,
  proxima_acao    TEXT,
  data_proxima    TEXT,              -- AAAA-MM-DD
  valor_proposta  REAL,
  anotacoes       TEXT,
  score           INTEGER DEFAULT 0,
  teste           INTEGER DEFAULT 0, -- 1 = dado fictício de demonstração
  coletado_em     TEXT DEFAULT (date('now')),
  criado_em       TEXT DEFAULT (datetime('now')),
  atualizado_em   TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_etapa ON leads(etapa);

-- Sinais de proximidade/intenção (marcados por você, com 1 clique)
CREATE TABLE IF NOT EXISTS sinais (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id   INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tipo      TEXT NOT NULL,  -- segue | interagiu | respondeu | indicacao | bem_estar
  nota      TEXT,
  fonte_url TEXT,
  criado_em TEXT DEFAULT (datetime('now')),
  UNIQUE(lead_id, tipo)
);

-- Histórico de ações (contato, resposta, mudança de etapa…)
CREATE TABLE IF NOT EXISTS atividades (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id   INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tipo      TEXT NOT NULL,
  canal     TEXT,
  descricao TEXT,
  criado_em TEXT DEFAULT (datetime('now'))
);

-- Fila de revisão: resultados de busca/fontes antes de virar lead
CREATE TABLE IF NOT EXISTS revisao (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo        TEXT DEFAULT 'pessoa',     -- pessoa | fonte
  titulo      TEXT,
  url         TEXT,
  trecho      TEXT,
  nome        TEXT,
  cargo       TEXT,
  empresa     TEXT,
  cidade      TEXT,
  uf          TEXT,
  email       TEXT,
  whatsapp    TEXT,
  instagram   TEXT,
  linkedin    TEXT,
  consulta    TEXT,
  status      TEXT DEFAULT 'pendente',   -- pendente | aprovado | descartado
  criado_em   TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_revisao_status ON revisao(status);

-- Quem pediu para não ser contatada (bloqueia importações futuras)
CREATE TABLE IF NOT EXISTS nao_contatar (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  chave     TEXT NOT NULL UNIQUE,  -- e-mail, telefone ou nome|empresa normalizados
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS config (
  chave TEXT PRIMARY KEY,
  valor TEXT
);
INSERT OR IGNORE INTO config (chave, valor) VALUES
  ('retencao_dias', '90'),
  ('limite_buscas_mes', '900'),
  ('link_formulario', ''),
  ('instagram_proprio', '@emagrecimentoblindado');

-- Buscas na internet: cache de 24 h e contador mensal (trava de custo)
CREATE TABLE IF NOT EXISTS buscas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  consulta   TEXT NOT NULL,
  resultado  TEXT,               -- JSON com os itens processados
  qtd        INTEGER DEFAULT 0,
  criado_em  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_buscas_consulta ON buscas(consulta, criado_em);
