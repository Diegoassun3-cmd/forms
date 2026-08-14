-- Email marketing: configuração do provedor de envio (uma linha, id=1, mesmo padrão de
-- site_config/indicacao_config/captacao_config).
CREATE TABLE IF NOT EXISTS email_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);

-- Listas de contatos.
CREATE TABLE IF NOT EXISTS email_lists (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nome      TEXT NOT NULL,
  criado_em TEXT NOT NULL
);

-- Contatos de cada lista (um e-mail não se repete dentro da mesma lista).
CREATE TABLE IF NOT EXISTS email_contacts (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id   INTEGER NOT NULL,
  nome      TEXT,
  email     TEXT NOT NULL,
  opt_out   INTEGER NOT NULL DEFAULT 0, -- 1 = cancelou a inscrição, não recebe mais nada
  criado_em TEXT NOT NULL,
  UNIQUE(list_id, email)
);

-- Criativos (templates de e-mail), montados em blocos (título, texto, imagem, botão, divisor, espaço).
CREATE TABLE IF NOT EXISTS email_templates (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT NOT NULL,
  blocks        TEXT NOT NULL, -- JSON: array de blocos
  criado_em     TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);

-- Campanhas (disparos): liga um criativo a uma lista.
CREATE TABLE IF NOT EXISTS email_campaigns (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT NOT NULL,
  assunto     TEXT NOT NULL,
  template_id INTEGER NOT NULL,
  list_id     INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'rascunho', -- rascunho | enviando | concluida
  criado_em   TEXT NOT NULL
);

-- Status de envio por contato dentro de cada campanha — permite retomar um envio grande em lotes
-- sem duplicar e-mail pra quem já recebeu.
CREATE TABLE IF NOT EXISTS email_sends (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  contact_id  INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pendente', -- pendente | enviado | falhou
  erro        TEXT,
  enviado_em  TEXT,
  UNIQUE(campaign_id, contact_id)
);
