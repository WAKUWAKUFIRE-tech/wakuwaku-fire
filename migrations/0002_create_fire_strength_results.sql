CREATE TABLE IF NOT EXISTS fire_strength_results (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  fire_type_id TEXT NOT NULL,
  fire_type_name TEXT NOT NULL,
  top_trait_1 TEXT NOT NULL,
  top_trait_2 TEXT NOT NULL,
  top_trait_3 TEXT NOT NULL,
  top_trait_4 TEXT NOT NULL,
  top_trait_5 TEXT NOT NULL,
  trait_scores_json TEXT NOT NULL,
  domain_scores_json TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  response_times_json TEXT NOT NULL,
  algorithm_version TEXT NOT NULL,
  question_version TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fire_strength_results_type
  ON fire_strength_results (fire_type_id);

CREATE INDEX IF NOT EXISTS idx_fire_strength_results_created
  ON fire_strength_results (created_at);
