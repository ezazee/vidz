# GITHUB-ACTION.MD

> Panduan setup dan cara kerja kedua GitHub Actions workflow di StoryZ.

---

## Dua Workflow

| Workflow | File | Event | Fungsi |
|---|---|---|---|
| AI Pipeline | `.github/workflows/ai_pipeline.yml` | `run_ai_pipeline` | Research → Scenes → Thumbnail |
| Render Video | `.github/workflows/render.yml` | `render_video` | Image → Voice → Remotion → Upload |

---

## Workflow 1: AI Pipeline (`ai_pipeline.yml`)

### Cara Kerja

```yaml
trigger: repository_dispatch (event: run_ai_pipeline)
payload: { project_id, base_url }

steps:
  1. actions/checkout@v4
  2. actions/setup-node@v4 (node 20)
  3. npm ci
  4. npx tsx --tsconfig tsconfig.json scripts/run-pipeline.ts <project_id>
     └── env dari GitHub Secrets (bukan dari client_payload)
  5. curl POST <base_url>/api/projects/<project_id>/generate
     └── trigger render workflow
```

### Kenapa `--tsconfig tsconfig.json`?

`tsx` perlu flag `--tsconfig` untuk me-resolve path alias `@/*` yang didefinisikan di `tsconfig.json`.
Tanpa flag ini, import seperti `import { getSql } from '@/lib/db/client'` akan gagal.

### Environment yang Dibutuhkan (GitHub Secrets)

```
DATABASE_URL
AI_API_KEY
AI_BASE_URL
AI_MODEL
IMAGE_MODEL
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
```

### Yang Dijalankan `run-pipeline.ts`

Script ini mengeksekusi seluruh AI pipeline secara berurutan dan menulis hasilnya langsung ke Neon DB:

```
1. Research      → lib/ai/research.ts   → INSERT INTO research
2. Director      → lib/ai/director.ts   → INSERT INTO director
3. Outline       → lib/ai/outline.ts    → INSERT INTO outlines
4. Scenes        → lib/ai/scenes.ts     → INSERT INTO scenes (42 scenes)
   └── per section secara berurutan (intro → chapter1 → chapter2 → chapter3 → ending)
5. SEO           → lib/ai/seo.ts        → INSERT INTO seo_metadata
6. Thumbnail     → AI image API         → R2 upload → INSERT INTO thumbnails
```

---

## Workflow 2: Render Video (`render.yml`)

### Cara Kerja

```yaml
trigger: repository_dispatch (event: render_video)
payload: { project_id, job_id }

jobs:
  prepare:
    - fetch-storyboard.js      → GET /api/projects/:id/storyboard → storyboard.json
    - fetch-pexels.js          → download stock video per scene (jika ada pexels_query)
    - generate-images.js       → AI image per scene (jika tidak ada Pexels video)
    - generate-voices.js       → TTS voice per scene
    - prepare-chunks.js        → bagi scenes menjadi chunk → matrix output

  render (paralel per chunk):
    - Remotion render → output/part-N.mp4
    - Upload artifact

  merge:
    - merge-chunks.js          → FFmpeg merge semua part → output/final.mp4
    - upload.js                → upload ke Cloudflare R2
    - update-job.js            → PATCH /api/render-jobs/:id { status, video_url }
```

### Environment yang Dibutuhkan (GitHub Secrets)

```
API_BASE_URL          URL Vercel app
API_SECRET            Token autentikasi API internal
AI_BASE_URL           Untuk generate images
AI_API_KEY            Untuk generate images
PEXELS_API_KEY        Untuk fetch stock video
R2_ACCOUNT_ID         Upload video
R2_ACCESS_KEY_ID      Upload video
R2_SECRET_ACCESS_KEY  Upload video
R2_BUCKET_NAME        Upload video
R2_PUBLIC_URL         URL publik video
TTS_VOICE             Voice ID TTS
```

---

## Setup Awal

### 1. Tambahkan semua GitHub Secrets

**GitHub → repo → Settings → Secrets and variables → Actions**

Lihat daftar lengkap di [`docs/ENVIRONMENT.MD`](ENVIRONMENT.MD).

### 2. Pastikan GITHUB_TOKEN punya permission yang benar

Di Vercel env:
```
GITHUB_TOKEN=ghp_xxxxx   (scope: repo → full control)
GITHUB_REPO=owner/repo
```

Atau di GitHub → Settings → Actions → General → Workflow permissions:
- Set ke **"Read and write permissions"**

### 3. Trigger pertama

Dari web, buat project baru dan klik **Generate**.
Pantau di tab **Actions** GitHub untuk melihat kedua workflow berjalan.

---

## Troubleshooting

| Error | Penyebab | Solusi |
|---|---|---|
| `AbortError: This operation was aborted` | Model AI hang (biasanya `creavoo-combo`) | Ganti `AI_MODEL` ke `groq/llama-3.3-70b-versatile` |
| `DATABASE_URL is not configured` | Secret `DATABASE_URL` belum ditambahkan | Tambahkan di GitHub Secrets |
| `Cannot find module '@/lib/...'` | tsx dipanggil tanpa `--tsconfig` | Sudah fix di workflow — pastikan pakai versi terbaru |
| `504 Gateway Timeout` dari curl | Vercel function timeout | Pipeline AI sudah di-move ke GitHub Actions — tidak harusnya terjadi lagi |
| `durationInFrames` error di Remotion | Frame range melebihi batas komposisi | Pastikan jumlah scenes sesuai dengan `durationInFrames` di komposisi |
