-- Formulário de Indicações — tabelas próprias, sem mexer no schema existente
-- do formulário de vagas (candidaturas / site_config).

-- Configuração editável do formulário de Indicações (mesmo formato de site_config,
-- guardada numa tabela própria pra não esbarrar no CHECK (id = 1) da tabela original).
CREATE TABLE IF NOT EXISTS indicacao_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);

-- Indicações recebidas.
CREATE TABLE IF NOT EXISTS indicacoes (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo                TEXT NOT NULL, -- imovel_venda | imovel_locacao | seguro | consorcio
  nome_indicado       TEXT NOT NULL,
  whatsapp_indicado   TEXT NOT NULL,
  email_indicado      TEXT,
  como_conhece        TEXT,
  detalhes            TEXT, -- JSON com os campos específicos do tipo escolhido
  nome_indicador      TEXT NOT NULL,
  whatsapp_indicador  TEXT NOT NULL,
  email_indicador     TEXT,
  autoriza_contato    TEXT NOT NULL,
  confirma_permissao  TEXT NOT NULL,
  criado_em           TEXT NOT NULL,
  extra_respostas     TEXT -- JSON das perguntas extras configuráveis pelo admin
);
