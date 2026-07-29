# Graph Report - .  (2026-07-19)

## Corpus Check
- 120 files · ~161,187 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 606 nodes · 920 edges · 51 communities (34 shown, 17 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.74)
- Token cost: 185,081 input · 0 output

## Community Hubs (Navigation)
- Analytics & Integrations API
- AI Content Generation API
- Frontend Dashboard Pages
- NPM Dependencies (core)
- Image Generation Script
- Thumbnail & Cleanup API
- Storyboard & Pipeline Types
- Dev Dependencies (tooling)
- TS/ESLint Config
- Manual Trigger Scripts
- Architecture & GitHub Actions Docs
- Database Schema Docs
- Director Engine Bibles Docs
- Project Design Principles Docs
- Pipeline Workflow Stages Docs
- Auth & Middleware
- Thumbnail Design Example
- DB Migration Script (add column)
- DB Migration Script (schema)
- App Layout & Providers
- Roadmap Phases Docs
- Zernio Account Debug Script
- Zernio Post Debug Script v1
- Zernio Post Debug Script v2
- YouTube Posts Debug Script
- Platforms Debug Script
- Pexels Fetch Script
- Background Music Generator
- Video Chunk Merge Script
- R2 Video Upload Script
- Cerita Tetangga Branding
- High-Level Architecture Docs
- AI Model Choice Docs
- Render Engine Philosophy Docs
- Render Workflow Jobs
- Automation Migration Script
- Local Render Script
- Vercel Timeout Rationale Docs
- Storyboard Fetch Script
- Chunk Prep Script
- Job Status Update Script
- No-ORM Rationale Docs
- Next.js Config
- Next.js Env Types
- PostCSS Config
- Tailwind Config
- Cerita Tetangga Logo Image
- Tech Debt Notes

## God Nodes (most connected - your core abstractions)
1. `getSql()` - 62 edges
2. `getChannel()` - 25 edges
3. `resolveChannelId()` - 24 edges
4. `chat()` - 20 edges
5. `compilerOptions` - 17 edges
6. `runPipeline()` - 13 edges
7. `ChannelId` - 12 edges
8. `StoryZ / Vidz project` - 11 edges
9. `StoryZ Database Schema (PostgreSQL)` - 11 edges
10. `projects table` - 11 edges

## Surprising Connections (you probably didn't know these)
- `AI Pipeline on GitHub Actions decision` --rationale_for--> `AI Pipeline workflow (ai_pipeline.yml)`  [EXTRACTED]
  docs/ARCHITECTURE.MD → .github/workflows/ai_pipeline.yml
- `GET()` --calls--> `getChannel()`  [EXTRACTED]
  app/api/analytics/route.ts → lib/channels.ts
- `POST()` --calls--> `authToken()`  [EXTRACTED]
  app/api/auth/login/route.ts → lib/auth.ts
- `POST()` --calls--> `getSql()`  [EXTRACTED]
  app/api/cleanup/route.ts → lib/db/client.ts
- `POST()` --calls--> `getSql()`  [EXTRACTED]
  app/api/integrations/telegram/test/route.ts → lib/db/client.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Director Engine bibles enforce cross-pipeline visual consistency** — docs_director_engine_director_engine, docs_director_engine_image_prompt_generator, docs_director_engine_script_generator, docs_project_consistency_first_principle [INFERRED 0.85]
- **AI pipeline stage sequence executed by run-pipeline.ts** — docs_workflow_stage1_research, docs_workflow_stage2_director_engine, docs_workflow_stage3_outline, docs_workflow_stage4_scenes, docs_workflow_stage5_seo, docs_workflow_stage6_thumbnail, github_workflows_ai_pipeline_run_pipeline_script [EXTRACTED 1.00]
- **GitHub Actions used to work around Vercel's 60s serverless timeout for both AI pipeline and rendering** — docs_architecture_ai_pipeline_on_github_actions, docs_environment_ai_pipeline_vs_vercel_constraint, docs_tech_stack_github_actions_renderer_rationale, github_workflows_ai_pipeline, github_workflows_render [INFERRED 0.90]

## Communities (51 total, 17 thin omitted)

### Community 0 - "Analytics & Integrations API"
Cohesion: 0.05
Nodes (57): GET(), GET(), GET(), POST(), syncYouTubeAccount(), POST(), GET(), GET() (+49 more)

### Community 1 - "AI Content Generation API"
Cohesion: 0.08
Nodes (47): POST(), RouteContext, POST(), RouteContext, POST(), RouteContext, GET(), chat() (+39 more)

### Community 2 - "Frontend Dashboard Pages"
Cohesion: 0.04
Nodes (30): AnalyticsPage(), CHANNEL_IDS, ChannelAnalytics, formatNumber(), PlatformStats, IntegrationStatus, CHANNEL_FILTERS, Project (+22 more)

### Community 3 - "NPM Dependencies (core)"
Cohesion: 0.05
Nodes (43): @aws-sdk/client-s3, @aws-sdk/lib-storage, cheerio, class-variance-authority, clsx, duck-duck-scrape, googlethis, lucide-react (+35 more)

### Community 4 - "Image Generation Script"
Cohesion: 0.08
Nodes (33): msedge-tts, msedge-tts, buildImagePrompt(), CATEGORY_PALETTE, CHANNEL_STYLE, delay(), fs, generateImageForScene() (+25 more)

### Community 5 - "Thumbnail & Cleanup API"
Cohesion: 0.09
Nodes (29): deletePrefix(), POST(), PREFIXES_TO_DELETE, generateBg(), POST(), RouteContext, POST(), RouteContext (+21 more)

### Community 6 - "Storyboard & Pipeline Types"
Cohesion: 0.09
Nodes (21): GET(), getBackgroundMusic(), RouteContext, CameraBible, CameraMovement, CharacterBible, EnvironmentBible, MotionBible (+13 more)

### Community 7 - "Dev Dependencies (tooling)"
Cohesion: 0.06
Nodes (31): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, pg, postcss, tailwindcss (+23 more)

### Community 8 - "TS/ESLint Config"
Cohesion: 0.07
Nodes (29): ./*, dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+21 more)

### Community 9 - "Manual Trigger Scripts"
Cohesion: 0.25
Nodes (12): main(), { neon }, { run, waitUntilDone, BW_TOPICS, CT_TOPICS }, BW_TOPICS, CS_THEMES, CT_TOPICS, delay(), main() (+4 more)

### Community 10 - "Architecture & GitHub Actions Docs"
Cohesion: 0.23
Nodes (13): 9Router AI Gateway, Cloudflare R2 storage, Deployment Architecture, Environment Variables Guide, GitHub Actions Setup Guide, tsx --tsconfig flag requirement, GitHub Actions as renderer decision, Tech Stack Reference (+5 more)

### Community 11 - "Database Schema Docs"
Cohesion: 0.28
Nodes (13): StoryZ Database Schema (PostgreSQL), director table, outlines table, projects table, render_jobs table, research table, scenes table, scripts table (+5 more)

### Community 12 - "Director Engine Bibles Docs"
Cohesion: 0.28
Nodes (9): Camera Bible, Character Bible, DirectorOutput type, Environment Bible, Image Prompt Generator, Motion Bible, Script Generator, Thumbnail Bible (+1 more)

### Community 13 - "Project Design Principles Docs"
Cohesion: 0.25
Nodes (9): Director Consistency Rules, Director Engine, Consistency First principle, Everything is Regeneratable principle, JSON Driven principle, Scene-Based Architecture principle, StoryZ Project Overview, System Workflow (Topic to YouTube Upload) (+1 more)

### Community 14 - "Pipeline Workflow Stages Docs"
Cohesion: 0.25
Nodes (8): Stage 1 — Research, Stage 2 — Director Engine, Stage 3 — Outline, Stage 4 — Scenes, Stage 5 — SEO, Stage 6 — Thumbnail (Auto), Stage 7 — Render (render.yml), Stage 8 — YouTube Upload

### Community 15 - "Auth & Middleware"
Cohesion: 0.48
Nodes (4): POST(), authToken(), config, middleware()

### Community 16 - "Thumbnail Design Example"
Cohesion: 0.48
Nodes (7): Contoh Thumbnail (Ottoman Sultanate Split-Screen), Bold Outlined Text Styling (Yellow/White with Black Stroke), Clickbait 'What If' Question Headline Pattern, Desaturated Ruin vs Vibrant Prosperity Color Contrast, Ottoman Sultanate Alternate-History Topic, Split-Screen Before/After Layout Pattern, Stick-Figure Reaction Character Overlay

### Community 17 - "DB Migration Script (add column)"
Cohesion: 0.40
Nodes (5): fs, loadEnv(), main(), { neon }, path

### Community 18 - "DB Migration Script (schema)"
Cohesion: 0.40
Nodes (5): fs, loadEnv(), main(), { neon }, path

### Community 20 - "Roadmap Phases Docs"
Cohesion: 0.40
Nodes (5): Phase 2 Advanced Motion (roadmap), Phase 1 — Core Engine, Phase 2 — Advanced Motion (Roadmap entry), Phase 3 — Automation, Phase 4 — Studio Features

### Community 26 - "Pexels Fetch Script"
Cohesion: 0.60
Nodes (4): delay(), fetchPexelsForScene(), fs, main()

### Community 27 - "Background Music Generator"
Cohesion: 0.50
Nodes (4): fs, generateWav(), path, writeWavHeader()

### Community 28 - "Video Chunk Merge Script"
Cohesion: 0.40
Nodes (3): { execSync }, fs, path

### Community 29 - "R2 Video Upload Script"
Cohesion: 0.50
Nodes (4): fs, main(), { S3Client }, { Upload }

### Community 30 - "Cerita Tetangga Branding"
Cohesion: 0.50
Nodes (4): Cerita Tetangga (Channel), Cerita Tetangga Mark (Watermark Image), public/branding Directory, Video Watermark Usage

### Community 31 - "High-Level Architecture Docs"
Cohesion: 0.50
Nodes (4): API Routes layer, Database layer (Neon PostgreSQL), Frontend layer (Next.js App Router), High-Level Architecture

### Community 32 - "AI Model Choice Docs"
Cohesion: 0.50
Nodes (4): AI Model choice: groq/llama-3.3-70b-versatile, GitHub Actions Troubleshooting table, AI module wrapper pattern (lib/ai/*), AI Client (lib/ai/client.ts)

### Community 33 - "Render Engine Philosophy Docs"
Cohesion: 0.50
Nodes (4): FFmpeg Pipeline, Render Engine Philosophy (no image-to-video), Remotion Composition structure, Sharp image preprocessing

### Community 34 - "Render Workflow Jobs"
Cohesion: 0.50
Nodes (4): merge job, prepare job, render job (matrix), status-failure job

### Community 36 - "Local Render Script"
Cohesion: 0.50
Nodes (3): PROJECT_ID, REMOTION_LOCAL_ASSETS, render-local.sh script

### Community 37 - "Vercel Timeout Rationale Docs"
Cohesion: 0.67
Nodes (3): AI Pipeline on GitHub Actions decision, AI Pipeline vs Vercel constraint, Error Handling table

## Knowledge Gaps
- **232 isolated node(s):** `ChannelAnalytics`, `PlatformStats`, `CHANNEL_IDS`, `PREFIXES_TO_DELETE`, `RouteContext` (+227 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSql()` connect `Analytics & Integrations API` to `AI Content Generation API`, `Thumbnail & Cleanup API`, `Storyboard & Pipeline Types`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `dependencies` connect `NPM Dependencies (core)` to `Image Generation Script`, `Dev Dependencies (tooling)`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `PATCH()` connect `Analytics & Integrations API` to `AI Content Generation API`, `Thumbnail & Cleanup API`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `ChannelAnalytics`, `PlatformStats`, `CHANNEL_IDS` to the rest of the system?**
  _232 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Analytics & Integrations API` be split into smaller, more focused modules?**
  _Cohesion score 0.05221518987341772 - nodes in this community are weakly interconnected._
- **Should `AI Content Generation API` be split into smaller, more focused modules?**
  _Cohesion score 0.07987711213517665 - nodes in this community are weakly interconnected._
- **Should `Frontend Dashboard Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.04251700680272109 - nodes in this community are weakly interconnected._