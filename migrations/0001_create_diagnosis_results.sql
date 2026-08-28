CREATE TABLE IF NOT EXISTS diagnosis_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anonymous_id TEXT NOT NULL,
  diagnosis_type TEXT NOT NULL,
  result_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_diagnosis_results_anonymous_type
  ON diagnosis_results (anonymous_id, diagnosis_type);

CREATE INDEX IF NOT EXISTS idx_diagnosis_results_ranking
  ON diagnosis_results (diagnosis_type, result_id);


