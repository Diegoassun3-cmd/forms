-- Convite (papel/envelope) — config própria (JSON livre, schema rico) e RSVPs.
CREATE TABLE IF NOT EXISTS convite_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS convite_rsvps (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nome           TEXT NOT NULL,
  email          TEXT,
  telefone       TEXT,
  empresa        TEXT,
  acompanhantes  TEXT,
  restricoes     TEXT,
  extra          TEXT,
  criado_em      TEXT NOT NULL
);
