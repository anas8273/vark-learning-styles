CREATE TABLE IF NOT EXISTS submissions (
 id text PRIMARY KEY, request_key text NOT NULL, response jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS results_identity_active_idx ON results
 ((COALESCE(data->>'cycleId','legacy')), (data->>'nameKey'), (data->>'gradeKey'), (data->>'classKey'))
 WHERE NULLIF(data->>'deletedAt','') IS NULL AND NULLIF(data->>'supersededAt','') IS NULL;
