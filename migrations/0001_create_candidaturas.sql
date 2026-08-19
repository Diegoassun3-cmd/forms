-- Tabela de candidaturas do formulário de corretores(as) parceiros(as) — Solua Imóveis
CREATE TABLE IF NOT EXISTS candidaturas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nome            TEXT NOT NULL,
  email           TEXT NOT NULL,
  whatsapp        TEXT NOT NULL,
  cidade          TEXT NOT NULL,
  creci           TEXT,
  experiencia     TEXT NOT NULL,
  captacao        TEXT NOT NULL,
  regioes         TEXT NOT NULL,
  tipos_imovel    TEXT NOT NULL,
  disponibilidade TEXT NOT NULL,
  veiculo         TEXT,
  portfolio       TEXT,
  remuneracao     TEXT NOT NULL,
  sobre_voce      TEXT,
  lgpd            TEXT NOT NULL,
  criado_em       TEXT NOT NULL
);
