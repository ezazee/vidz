# StoryZ / Vidz

AI production studio untuk menghasilkan video dokumenter YouTube secara otomatis dari sebuah topik.

**Live:** https://vidz-factory.vercel.app

---

## Quick Start (Development Lokal)

```bash
cp .env.example .env   # isi variabel yang dibutuhkan
npm install
npm run dev
```

Buka `http://localhost:3000`.

---

## Cara Kerja (Overview)

1. **Input topik** di web → pipeline AI berjalan otomatis via GitHub Actions
2. **AI Pipeline** (Research → Director → Outline → Scenes → SEO → Thumbnail) berjalan di GitHub Actions runner — bebas dari batas waktu 60 detik Vercel
3. **Render video** juga di GitHub Actions menggunakan Remotion + FFmpeg
4. **Upload otomatis** ke YouTube setelah render selesai

---

## Project Structure

```
app/                        Next.js App Router (UI + API routes)
  api/projects/[id]/
    pipeline/route.ts       Dispatch GitHub Action untuk AI pipeline
    research/route.ts       API stage research (juga bisa dipanggil manual)
    director/route.ts       API stage director
    outline/route.ts        API stage outline
    scenes/route.ts         API stage scenes (support chunking via ?sectionIndex=N)
    generate/route.ts       Dispatch GitHub Action untuk render video
    thumbnail/              API save & generate thumbnail
    publish/route.ts        Upload ke YouTube

lib/
  ai/
    client.ts               OpenAI-compatible chat client (groq/llama-3.3-70b-versatile)
    research.ts             AI module: Research
    director.ts             AI module: Director Engine
    outline.ts              AI module: Outline Generator
    scenes.ts               AI module: Scene & Narration Generator (42 scenes target)
    seo.ts                  AI module: SEO Metadata Generator
  db/client.ts              Neon PostgreSQL (@neondatabase/serverless)
  github/dispatch.ts        Helper dispatch GitHub Actions (render & AI pipeline)
  r2.ts                     Upload ke Cloudflare R2

scripts/
  run-pipeline.ts           Script AI pipeline (dijalankan di GitHub Actions runner)
  fetch-storyboard.js       Ambil storyboard dari API untuk render
  generate-images.js        Generate gambar per scene
  generate-voices.js        Generate voice TTS per scene
  fetch-pexels.js           Download stock video dari Pexels
  prepare-chunks.js         Bagi scenes menjadi chunk untuk render paralel
  merge-chunks.js           Gabung video chunk hasil render
  upload.js                 Upload video final ke Cloudflare R2
  update-job.js             Update status job di database

.github/workflows/
  ai_pipeline.yml           Workflow AI pipeline (Research → Scenes → Thumbnail)
  render.yml                Workflow render video (Image → Voice → Remotion → Upload)

migrations/                 SQL migration files
docs/                       Dokumentasi arsitektur dan panduan
src/                        Remotion video composition (StoryZVideo)
```

---

## Environment

Gunakan `.env.example` sebagai template. Lihat [`docs/ENVIRONMENT.MD`](docs/ENVIRONMENT.MD) untuk panduan lengkap.

---

## Dokumentasi

| File | Isi |
|---|---|
| [`docs/ARCHITECTURE.MD`](docs/ARCHITECTURE.MD) | Arsitektur sistem & request flow |
| [`docs/WORKFLOW.MD`](docs/WORKFLOW.MD) | Detail setiap stage pipeline |
| [`docs/ENVIRONMENT.MD`](docs/ENVIRONMENT.MD) | Panduan env vars & GitHub Secrets |
| [`docs/GITHUB-ACTION.MD`](docs/GITHUB-ACTION.MD) | Setup GitHub Actions |
| [`docs/DATABASE.MD`](docs/DATABASE.MD) | Schema database |
| [`docs/TECH-STACK.MD`](docs/TECH-STACK.MD) | Stack teknologi |
| [`docs/RENDER-ENGINE.MD`](docs/RENDER-ENGINE.MD) | Render pipeline detail |
| [`docs/DIRECTOR-ENGINE.MD`](docs/DIRECTOR-ENGINE.MD) | Director Engine detail |
| [`docs/ROADMAP.MD`](docs/ROADMAP.MD) | Rencana pengembangan |
