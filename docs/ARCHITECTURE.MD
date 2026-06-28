# ARCHITECTURE.md

> Arsitektur sistem StoryZ secara menyeluruh — request flow, komponen utama, dan batas tanggung jawab tiap layer.

---

## High-Level Architecture

```
User (Browser)
    │
    ▼
Vercel (Next.js) — vidz-factory.vercel.app
    │
    ├── Frontend (React + Tailwind)
    │       Dashboard project, progress pipeline, preview scenes
    │
    └── API Routes (Next.js)
            │
            ├── Neon PostgreSQL (@neondatabase/serverless)
            │       (projects, research, director, outlines, scenes,
            │        seo_metadata, thumbnails, render_jobs)
            │
            └── GitHub Actions (via repository_dispatch)
                    │
                    ├── Workflow: ai_pipeline.yml
                    │       └── GitHub Runner
                    │               └── npx tsx scripts/run-pipeline.ts
                    │                       (Research → Director → Outline
                    │                        → Scenes → SEO → Thumbnail)
                    │
                    └── Workflow: render.yml
                            └── GitHub Runner
                                    ├── fetch-storyboard.js
                                    ├── fetch-pexels.js
                                    ├── generate-images.js
                                    ├── generate-voices.js
                                    ├── Remotion render (paralel per chunk)
                                    ├── FFmpeg merge
                                    ├── Upload ke Cloudflare R2
                                    └── update-job.js → PATCH /api/render-jobs/:id
```

---

## Kenapa AI Pipeline di GitHub Actions?

Vercel Hobby plan memiliki batas waktu **60 detik absolut** per serverless function.
Seluruh proses AI (Research + Director + Outline + Scenes + SEO) membutuhkan **±75–120 detik**.

Solusi: pipeline AI di-dispatch ke GitHub Actions runner yang **bebas dari batas waktu Vercel**.
- `POST /api/projects/:id/pipeline` → dispatch `run_ai_pipeline` event → runner eksekusi `run-pipeline.ts`
- Semua hasil ditulis langsung ke Neon DB oleh runner
- Frontend polling DB untuk update status

---

## Layer Responsibilities

### Frontend (Next.js App Router)

- Dashboard project: daftar project, status pipeline, progress render
- Detail project: preview scenes (gambar, narasi, subtitle), SEO metadata, thumbnail
- Polling status render job via interval fetch
- Trigger generate, regenerate per scene/section

### API Routes

| Route | Fungsi |
|---|---|
| `POST /api/projects` | Buat project baru |
| `POST /api/projects/:id/pipeline` | Dispatch AI pipeline ke GitHub Actions |
| `POST /api/projects/:id/research` | Stage research (bisa dipanggil sendiri) |
| `POST /api/projects/:id/director` | Stage director |
| `POST /api/projects/:id/outline` | Stage outline |
| `POST /api/projects/:id/scenes` | Stage scenes (support `?sectionIndex=N`) |
| `POST /api/projects/:id/generate` | Dispatch render workflow ke GitHub Actions |
| `POST /api/projects/:id/thumbnail/generate` | Generate thumbnail via AI image |
| `POST /api/projects/:id/thumbnail` | Simpan thumbnail ke DB |
| `POST /api/projects/:id/publish` | Upload video ke YouTube |
| `GET /api/projects/:id/storyboard` | Ambil storyboard JSON untuk render runner |

### GitHub Actions Runner (ai_pipeline.yml)

- Checkout repo
- Install dependencies (`npm ci`)
- Jalankan `npx tsx --tsconfig tsconfig.json scripts/run-pipeline.ts <project_id>`
- Script membaca env dari **GitHub Secrets** (bukan dari client_payload)
- Setelah selesai, trigger render via curl ke `/api/projects/:id/generate`

### GitHub Actions Runner (render.yml)

- Paralel: fetch storyboard, generate images, generate voices, download Pexels videos
- Render video per chunk dengan Remotion (paralel matrix)
- FFmpeg merge semua chunk
- Upload MP4 final ke Cloudflare R2
- PATCH `/api/render-jobs/:id` dengan video URL dan status `completed`

### Database (Neon PostgreSQL)

Single source of truth. Semua AI output disimpan sebagai JSON column.

| Tabel | Isi |
|---|---|
| `projects` | Data project utama |
| `research` | Output AI research |
| `director` | Director bibles (visual, character, environment, camera, motion, thumbnail) |
| `outlines` | Struktur sections JSON |
| `scenes` | Semua adegan dengan narasi, prompt, camera, dll |
| `seo_metadata` | Title, description, tags, hashtags |
| `thumbnails` | URL thumbnail tersimpan |
| `render_jobs` | Status & URL video render |
| `schedules` | Jadwal auto-publish harian |

---

## Request Flow — Start Pipeline

```
1. User klik "Generate" di web
        │
2. POST /api/projects/:id/pipeline
        │
3. Vercel: dispatch repository_dispatch → event: run_ai_pipeline
        │                                 payload: { project_id, base_url }
        │
4. GitHub Actions (ai_pipeline.yml) berjalan:
        │
        ├── npx tsx --tsconfig tsconfig.json scripts/run-pipeline.ts <id>
        │       ├── Research      → INSERT INTO research
        │       ├── Director      → INSERT INTO director
        │       ├── Outline       → INSERT INTO outlines
        │       ├── Scenes        → INSERT INTO scenes (42 scenes)
        │       ├── SEO           → INSERT INTO seo_metadata
        │       └── Thumbnail     → AI image → R2 → INSERT INTO thumbnails
        │
        └── curl POST /api/projects/:id/generate (mode: full)
                │
                └── dispatch repository_dispatch → event: render_video
                        │
                        └── GitHub Actions (render.yml) berjalan
                                ├── Generate images & voices
                                ├── Render Remotion (paralel)
                                ├── FFmpeg merge
                                └── Upload R2 + update DB
```

---

## Deployment Architecture

```
Branch: main → Vercel auto-deploy (production)

Database:
    Neon PostgreSQL — serverless connection pooling

Storage:
    Cloudflare R2 — images, voices, video final, thumbnails
    Bucket: vidz-factory
    Public URL: https://pub-e6a3fd31a6b9466f93d7e02cf9f92fe4.r2.dev

AI Gateway:
    9Router (creavoo-9router.fly.dev/v1)
    Model: groq/llama-3.3-70b-versatile (ultra-fast, <1 detik)
    Image Model: cf/@cf/stabilityai/stable-diffusion-xl-base-1.0

Render:
    GitHub Actions: render.yml + ai_pipeline.yml
    Trigger: repository_dispatch
```