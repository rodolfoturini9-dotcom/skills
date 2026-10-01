-- Fila de execuções de IA (Claude): permite gerações longas em função de background,
-- registra modelo e consumo de tokens. O corpo da requisição é apagado ao concluir.
CREATE TABLE ai_jobs (
  id text PRIMARY KEY,
  path text NOT NULL,
  operation text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'queued',
  http_status integer,
  result text,
  model text NOT NULL DEFAULT '',
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  created_at text NOT NULL,
  started_at text,
  finished_at text
);
CREATE INDEX ai_jobs_created_idx ON ai_jobs (created_at);
