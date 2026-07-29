# Graph Report - .  (2026-07-29)

## Corpus Check
- 135 files · ~310,506 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 707 nodes · 1087 edges · 62 communities (42 shown, 20 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Project API Routes
- NPM Dependencies
- Dashboard & Channel UI
- Voice & Image Gen Scripts
- Database Schema
- Cleanup & Thumbnail API
- Dev Dependencies
- Storyboard & Pipeline Types
- TypeScript Config
- Library & Project Detail UI
- Cron & Integrations API
- Landing Page & 3D Stage
- Pipeline Trigger API
- Workflow Stages Docs
- Manual Trigger Scripts
- Analytics & Publish API
- Render Engine & Jobs
- Changelog & Architecture Docs
- API Routes & Env Docs
- Scene Variation Logic
- Projects CRUD API
- App Layout & Providers
- Auth & Middleware
- Render Jobs API & Telegram
- Recommendations API
- 9Router AI Gateway Docs
- DB Migration: Add Column
- DB Migration Script
- Generate & Dispatch Render
- CI Pipeline Trigger Docs
- Scratch: Check Accounts
- Scratch: Zernio Post
- Scratch: Zernio Post v2
- Scratch: Find YouTube Posts
- Scratch: Print Platforms
- Fetch Pexels Script
- Generate BGM Script
- Merge Render Chunks
- Upload to R2 Script
- Integrations API
- StoryZ Brand Mark
- Migrate Automation Script
- Local Render Script
- Cabang Sejarah Thumbnail
- Cerita Tetangga Brand
- Design System Docs
- Fetch Storyboard Script
- Prepare Chunks Script
- Update Job Script
- Design Theme Tokens
- No-ORM DB Rationale
- AI Provider Decision
- Next.js Config
- Next Env Types
- PostCSS Config
- Tailwind Config
- Regeneratable Principle
- Backend Stack Decision
- Frontend Stack Decision

## God Nodes (most connected - your core abstractions)
1. `getSql()` - 64 edges
2. `getChannel()` - 31 edges
3. `resolveChannelId()` - 26 edges
4. `chat()` - 23 edges
5. `compilerOptions` - 17 edges
6. `ChannelId` - 16 edges
7. `Render Video Workflow` - 16 edges
8. `runPipeline()` - 14 edges
9. `Project Structure overview` - 13 edges
10. `AI Pipeline Workflow` - 11 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `getSql()`  [EXTRACTED]
  app/api/projects/[id]/route.ts → lib/db/client.ts
- `lib/github/dispatch.ts` --calls--> `AI Pipeline Workflow`  [INFERRED]
  README.md → .github/workflows/ai_pipeline.yml
- `API Routes table` --references--> `Render Video Workflow`  [EXTRACTED]
  docs/ARCHITECTURE.MD → .github/workflows/render.yml
- `Deployment Architecture` --references--> `Render Video Workflow`  [EXTRACTED]
  docs/ARCHITECTURE.MD → .github/workflows/render.yml
- `Request Flow — Start Pipeline` --references--> `Render Video Workflow`  [EXTRACTED]
  docs/ARCHITECTURE.MD → .github/workflows/render.yml

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Render workflow job pipeline (prepare/render/merge/status-failure)** — github_workflows_render_prepare_job, github_workflows_render_render_job, github_workflows_render_merge_job, github_workflows_render_status_failure_job [EXTRACTED 1.00]
- **Director Engine Bible Outputs** — docs_director_engine_visualbible, docs_director_engine_characterbible, docs_director_engine_environmentbible, docs_director_engine_camerabible, docs_director_engine_motionbible, docs_director_engine_thumbnailbible [EXTRACTED 1.00]
- **AI pipeline & render workflows depend on shared GitHub Secrets and environment config** — github_workflows_ai_pipeline_workflow, github_workflows_render_workflow, docs_environment_github_secrets [EXTRACTED 1.00]
- **AI Pipeline six-stage generation flow** — docs_workflow_stage1_research, docs_workflow_stage2_director, docs_workflow_stage3_outline, docs_workflow_stage4_scenes, docs_workflow_stage5_seo, docs_workflow_stage6_thumbnail [EXTRACTED 1.00]

## Communities (62 total, 20 thin omitted)

### Community 0 - "Project API Routes"
Cohesion: 0.07
Nodes (58): CHANNEL_IDS, GET(), POST(), RouteContext, POST(), RouteContext, POST(), RouteContext (+50 more)

### Community 1 - "NPM Dependencies"
Cohesion: 0.04
Nodes (49): @aws-sdk/client-s3, @aws-sdk/lib-storage, cheerio, class-variance-authority, clsx, duck-duck-scrape, framer-motion, googlethis (+41 more)

### Community 2 - "Dashboard & Channel UI"
Cohesion: 0.07
Nodes (31): Channel, LANG_LABEL, AnalyticsData, ChannelId, CHANNELS, num(), OverviewPage(), PlatformStats (+23 more)

### Community 3 - "Voice & Image Gen Scripts"
Cohesion: 0.08
Nodes (33): msedge-tts, msedge-tts, buildImagePrompt(), CATEGORY_PALETTE, CHANNEL_STYLE, delay(), fs, generateImageForScene() (+25 more)

### Community 4 - "Database Schema"
Cohesion: 0.07
Nodes (36): director table, outlines table, projects table, research table, scenes table, scripts table, seo_metadata table, set_updated_at() trigger function (+28 more)

### Community 5 - "Cleanup & Thumbnail API"
Cohesion: 0.09
Nodes (29): deletePrefix(), POST(), PREFIXES_TO_DELETE, generateBg(), POST(), RouteContext, POST(), RouteContext (+21 more)

### Community 6 - "Dev Dependencies"
Cohesion: 0.06
Nodes (33): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, pg, postcss, tailwindcss (+25 more)

### Community 7 - "Storyboard & Pipeline Types"
Cohesion: 0.09
Nodes (21): GET(), getBackgroundMusic(), RouteContext, CameraBible, CameraMovement, CharacterBible, EnvironmentBible, MotionBible (+13 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.07
Nodes (29): ./*, dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+21 more)

### Community 9 - "Library & Project Detail UI"
Cohesion: 0.07
Nodes (18): CHANNEL_FILTERS, Project, Project, RENDER_LOGS, RenderStatus, Scene, ThumbnailGeneratorProps, buildStages() (+10 more)

### Community 10 - "Cron & Integrations API"
Cohesion: 0.14
Nodes (16): GET(), POST(), GET(), GET(), POST(), RouteContext, GET(), DELETE() (+8 more)

### Community 11 - "Landing Page & 3D Stage"
Cohesion: 0.16
Nodes (11): SPREAD_DIR, STRANDS, Z_PATH, Bible, BIBLES, LANDING_CHANNELS, LandingChannel, PIPELINE (+3 more)

### Community 12 - "Pipeline Trigger API"
Cohesion: 0.16
Nodes (12): POST(), RouteContext, DELETE(), GET(), env, envSchema, optionalString, optionalUrl (+4 more)

### Community 13 - "Workflow Stages Docs"
Cohesion: 0.19
Nodes (16): AI Pipeline workflow doc (ai_pipeline.yml), Stage 1 — Research, Stage 2 — Director Engine, Stage 3 — Outline, Stage 4 — Scenes (42 scenes), Stage 5 — SEO, Stage 6 — Thumbnail (Auto), lib/db/client.ts (Neon PostgreSQL) (+8 more)

### Community 14 - "Manual Trigger Scripts"
Cohesion: 0.25
Nodes (12): main(), { neon }, { run, waitUntilDone, BW_TOPICS, CT_TOPICS }, BW_TOPICS, CS_THEMES, CT_TOPICS, delay(), main() (+4 more)

### Community 15 - "Analytics & Publish API"
Cohesion: 0.23
Nodes (8): GET(), GET(), RouteContext, POST(), RouteContext, PATCH(), RouteContext, resolveChannelId()

### Community 16 - "Render Engine & Jobs"
Cohesion: 0.21
Nodes (12): render_jobs table, Render Video workflow doc (render.yml), Partial Render Mode, Rendering: Remotion + FFmpeg + Sharp on GitHub Actions, Storage: GitHub Runner temp -> Blob, merge job, prepare job, render job (matrix) (+4 more)

### Community 17 - "Changelog & Architecture Docs"
Cohesion: 0.18
Nodes (11): Release 0.1.0 (Initial Release), Release 1.1.0, Unreleased section, VID-1: Error 409 Topik Duplikat fix, Kejujuran data (no fabricated numbers rule), High-Level Architecture diagram, Neon PostgreSQL (source of truth), Local Development (.env) (+3 more)

### Community 18 - "API Routes & Env Docs"
Cohesion: 0.22
Nodes (10): API Routes table, Request Flow — Start Pipeline, Kenapa AI Pipeline di GitHub Actions? (rationale), AI Pipeline vs Vercel note (60s timeout limit), GitHub Actions Secrets, Setup Awal (GitHub Secrets + token permissions), Error Handling table, Stage 7 — Render (GitHub Actions: render.yml) (+2 more)

### Community 19 - "Scene Variation Logic"
Cohesion: 0.22
Nodes (7): CAMERA_POOL, STICKMAN_POSITIONS, StickmanPosition, TEXT_TREATMENTS, TextTreatment, THUMBNAIL_LAYOUTS, ThumbnailLayout

### Community 20 - "Projects CRUD API"
Cohesion: 0.36
Nodes (7): ALL_CHANNELS, createProjectSchema, fetchProjectsForChannel(), GET(), normalizeTopic(), POST(), varyTopic()

### Community 21 - "App Layout & Providers"
Cohesion: 0.29
Nodes (5): geist, metadata, mono, viewport, Providers()

### Community 22 - "Auth & Middleware"
Cohesion: 0.48
Nodes (4): POST(), authToken(), config, middleware()

### Community 23 - "Render Jobs API & Telegram"
Cohesion: 0.38
Nodes (5): GET(), PATCH(), RouteContext, updateJobSchema, sendTelegram()

### Community 24 - "Recommendations API"
Cohesion: 0.40
Nodes (5): GET(), normalize(), planEntrySchema, POST(), saveSchema

### Community 25 - "9Router AI Gateway Docs"
Cohesion: 0.40
Nodes (6): 9Router AI Gateway (groq/llama-3.3-70b-versatile), Deployment Architecture, AI Model note: use groq/llama-3.3-70b-versatile, avoid creavoo-combo, Troubleshooting table, AI Client (lib/ai/client.ts) description, lib/ai/client.ts (OpenAI-compatible chat client)

### Community 26 - "DB Migration: Add Column"
Cohesion: 0.40
Nodes (5): fs, loadEnv(), main(), { neon }, path

### Community 27 - "DB Migration Script"
Cohesion: 0.40
Nodes (5): fs, loadEnv(), main(), { neon }, path

### Community 28 - "Generate & Dispatch Render"
Cohesion: 0.50
Nodes (4): generateSchema, POST(), RouteContext, dispatchRenderWorkflow()

### Community 29 - "CI Pipeline Trigger Docs"
Cohesion: 0.40
Nodes (5): Kenapa --tsconfig tsconfig.json (path alias @/* resolution), Run AI Pipeline step (scripts/run-pipeline.ts), run-pipeline job, Trigger Generate Render step (curl POST /generate), scripts/run-pipeline.ts

### Community 35 - "Fetch Pexels Script"
Cohesion: 0.60
Nodes (4): delay(), fetchPexelsForScene(), fs, main()

### Community 36 - "Generate BGM Script"
Cohesion: 0.50
Nodes (4): fs, generateWav(), path, writeWavHeader()

### Community 37 - "Merge Render Chunks"
Cohesion: 0.40
Nodes (3): { execSync }, fs, path

### Community 38 - "Upload to R2 Script"
Cohesion: 0.50
Nodes (4): fs, main(), { S3Client }, { Upload }

### Community 39 - "Integrations API"
Cohesion: 0.83
Nodes (3): GET(), POST(), syncYouTubeAccount()

### Community 42 - "Local Render Script"
Cohesion: 0.50
Nodes (3): PROJECT_ID, REMOTION_LOCAL_ASSETS, render-local.sh script

### Community 43 - "Cabang Sejarah Thumbnail"
Cohesion: 0.67
Nodes (3): Cabang Sejarah (alternate history channel), contoh-thumbnail.jpg (example video thumbnail, Ottoman alternate history), Video Thumbnail (YouTube/Facebook)

### Community 44 - "Cerita Tetangga Brand"
Cohesion: 1.00
Nodes (3): Cerita Tetangga (neighborhood drama channel), ChatGPT Image Jul 15, 2026 09:48:21 PM (Cerita Tetangga porch illustration draft), cerita-tetangga-mark.png (Cerita Tetangga channel brand mark)

### Community 45 - "Design System Docs"
Cohesion: 0.67
Nodes (3): Peta menu (app routes), components/Sidebar.tsx, Workbench macrostructure (app pages shell)

## Knowledge Gaps
- **273 isolated node(s):** `CHANNEL_IDS`, `PREFIXES_TO_DELETE`, `RouteContext`, `generateSchema`, `RouteContext` (+268 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSql()` connect `Cron & Integrations API` to `Project API Routes`, `Cleanup & Thumbnail API`, `Integrations API`, `Storyboard & Pipeline Types`, `Pipeline Trigger API`, `Analytics & Publish API`, `Projects CRUD API`, `Render Jobs API & Telegram`, `Recommendations API`, `Generate & Dispatch Render`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `dependencies` connect `NPM Dependencies` to `Voice & Image Gen Scripts`, `Dev Dependencies`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `PATCH()` connect `Render Jobs API & Telegram` to `Project API Routes`, `Cleanup & Thumbnail API`, `Cron & Integrations API`, `Analytics & Publish API`, `Scene Variation Logic`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `CHANNEL_IDS`, `PREFIXES_TO_DELETE`, `RouteContext` to the rest of the system?**
  _273 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Project API Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.07034431691965938 - nodes in this community are weakly interconnected._
- **Should `NPM Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `Dashboard & Channel UI` be split into smaller, more focused modules?**
  _Cohesion score 0.07439024390243902 - nodes in this community are weakly interconnected._