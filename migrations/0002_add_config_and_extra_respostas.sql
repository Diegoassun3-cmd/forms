-- Configurações editáveis do site (textos, aparência, perguntas extras),
-- guardadas como um único JSON na linha id=1.
CREATE TABLE IF NOT EXISTS site_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);

-- Respostas das perguntas extras configuráveis (JSON), uma por candidatura.
-- OBS: SQLite/D1 não suporta "ADD COLUMN IF NOT EXISTS" — rode uma vez só.
ALTER TABLE candidaturas ADD COLUMN extra_respostas TEXT;
