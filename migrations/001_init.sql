CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE pipeline_status AS ENUM (
  'idle', 'pending', 'processing', 'completed', 'failed'
);

CREATE TYPE render_mode AS ENUM (
  'full', 'partial'
);

CREATE TYPE video_status AS ENUM (
  'draft', 'rendered', 'uploaded'
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  topic TEXT NOT NULL,
  status video_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  summary TEXT,
  facts JSONB,
  timeline JSONB,
  "references" JSONB,
  status pipeline_status NOT NULL DEFAULT 'idle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE director (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  genre TEXT,
  visual_style TEXT,
  emotion TEXT,
  lighting TEXT,
  color_palette JSONB,
  thumbnail_style TEXT,
  voice_style TEXT,
  camera_style TEXT,
  transition TEXT,
  image_style TEXT,
  visual_bible JSONB,
  character_bible JSONB,
  environment_bible JSONB,
  camera_bible JSONB,
  motion_bible JSONB,
  thumbnail_bible JSONB,
  status pipeline_status NOT NULL DEFAULT 'idle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  structure JSONB NOT NULL,
  status pipeline_status NOT NULL DEFAULT 'idle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  outline_section TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  status pipeline_status NOT NULL DEFAULT 'idle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  narration TEXT,
  image_prompt TEXT,
  camera TEXT,
  duration NUMERIC(5,2),
  subtitle TEXT,
  effect TEXT,
  emotion TEXT,
  transition TEXT,
  image_url TEXT,
  image_status pipeline_status NOT NULL DEFAULT 'idle',
  voice_url TEXT,
  voice_status pipeline_status NOT NULL DEFAULT 'idle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  mode render_mode NOT NULL DEFAULT 'full',
  scene_ids JSONB,
  status pipeline_status NOT NULL DEFAULT 'pending',
  video_url TEXT,
  gh_run_id TEXT,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE thumbnails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  prompt TEXT,
  image_url TEXT,
  overlay_text TEXT,
  status pipeline_status NOT NULL DEFAULT 'idle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE seo_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  tags JSONB,
  hashtags JSONB,
  chapters JSONB,
  status pipeline_status NOT NULL DEFAULT 'idle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  youtube_id TEXT,
  youtube_url TEXT,
  playlist_id TEXT,
  scheduled_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ,
  status pipeline_status NOT NULL DEFAULT 'idle',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_research_project_id ON research(project_id);
CREATE INDEX idx_director_project_id ON director(project_id);
CREATE INDEX idx_outlines_project_id ON outlines(project_id);
CREATE INDEX idx_scripts_project_id ON scripts(project_id);
CREATE INDEX idx_scripts_order ON scripts(project_id, order_index);
CREATE INDEX idx_scenes_project_id ON scenes(project_id);
CREATE INDEX idx_scenes_order ON scenes(project_id, order_index);
CREATE INDEX idx_render_jobs_project ON render_jobs(project_id);
CREATE INDEX idx_render_jobs_status ON render_jobs(status);
CREATE INDEX idx_thumbnails_project ON thumbnails(project_id);
CREATE INDEX idx_seo_project ON seo_metadata(project_id);
CREATE INDEX idx_uploads_project ON uploads(project_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_research_updated_at BEFORE UPDATE ON research FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_director_updated_at BEFORE UPDATE ON director FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_outlines_updated_at BEFORE UPDATE ON outlines FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_scripts_updated_at BEFORE UPDATE ON scripts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_scenes_updated_at BEFORE UPDATE ON scenes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_render_jobs_updated_at BEFORE UPDATE ON render_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_thumbnails_updated_at BEFORE UPDATE ON thumbnails FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_seo_updated_at BEFORE UPDATE ON seo_metadata FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_uploads_updated_at BEFORE UPDATE ON uploads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
