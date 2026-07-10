-- Anti-templated-pattern: field variasi per video (untuk mitigasi "inauthentic content"
-- + bahan memory/similarity system nanti). Semua di projects (satu baris per video).
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS closing_insight TEXT,
  ADD COLUMN IF NOT EXISTS opening_style_used TEXT,
  ADD COLUMN IF NOT EXISTS visual_effect_sequence JSONB,
  ADD COLUMN IF NOT EXISTS thumbnail_layout TEXT,
  ADD COLUMN IF NOT EXISTS stickman_position TEXT,
  ADD COLUMN IF NOT EXISTS text_treatment TEXT;
