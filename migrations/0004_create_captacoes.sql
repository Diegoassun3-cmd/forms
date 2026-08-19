-- Formulário de Captação de imóveis — tabelas próprias, mesmo padrão de indicacao_config/indicacoes.

-- Configuração editável do formulário de Captação (mesmo formato de site_config/indicacao_config).
CREATE TABLE IF NOT EXISTS captacao_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);

-- Cadastros de imóveis recebidos.
CREATE TABLE IF NOT EXISTS captacoes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  nome              TEXT NOT NULL,
  whatsapp          TEXT NOT NULL,
  email             TEXT,
  objetivo          TEXT NOT NULL, -- Quero vender | Quero alugar | Ainda não decidi
  cep               TEXT NOT NULL,
  endereco          TEXT NOT NULL,
  numero            TEXT,
  complemento       TEXT,
  bairro            TEXT NOT NULL,
  cidade            TEXT NOT NULL,
  tipo_imovel       TEXT NOT NULL,
  valor_pretendido  TEXT,
  lgpd              TEXT NOT NULL,
  criado_em         TEXT NOT NULL,
  extra_respostas   TEXT -- JSON das perguntas extras configuráveis pelo admin
);
