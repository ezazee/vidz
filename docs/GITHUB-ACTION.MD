# GITHUB_ACTIONS.md

> Dokumentasi lengkap GitHub Actions workflow untuk StoryZ — trigger, jobs, secrets, dan error handling.

---

## Overview

StoryZ menggunakan GitHub Actions sebagai **rendering engine** karena:
- Gratis untuk public repo (2.000 menit/bulan untuk private)
- Runner menyediakan resource cukup untuk Remotion + FFmpeg
- Tidak perlu server dedicated — zero infra cost untuk rendering
- Mudah di-trigger via `repository_dispatch` dari Next.js API

---

## Workflow File

**Path:** `.github/workflows/render.yml`

```yaml
name: Render Video

on:
  repository_dispatch:
    types: [render_video]

jobs:
  render:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install FFmpeg
        run: sudo apt-get install -y ffmpeg

      - name: Install Chrome (for Remotion)
        run: npx remotion browser ensure

      - name: Fetch storyboard
        id: fetch
        run: |
          node scripts/fetch-storyboard.js \
            --project-id="${{ github.event.client_payload.project_id }}" \
            --mode="${{ github.event.client_payload.mode }}" \
            --scene-ids="${{ github.event.client_payload.scene_ids }}"
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
          API_SECRET: ${{ secrets.API_SECRET }}

      - name: Generate images
        run: node scripts/generate-images.js
        env:
          NINE_ROUTER_API_KEY: ${{ secrets.NINE_ROUTER_API_KEY }}

      - name: Generate voices
        run: node scripts/generate-voices.js
        env:
          NINE_ROUTER_API_KEY: ${{ secrets.NINE_ROUTER_API_KEY }}

      - name: Render video (Remotion)
        run: |
          npx remotion render VideoComposition output/frames/ \
            --props="./storyboard.json" \
            --image-format=png \
            --jpeg-quality=90 \
            --concurrency=2

      - name: Mux audio + video (FFmpeg)
        run: node scripts/mux.js

      - name: Upload video to storage
        id: upload
        run: node scripts/upload.js
        env:
          BLOB_READ_WRITE_TOKEN: ${{ secrets.BLOB_READ_WRITE_TOKEN }}

      - name: Update database — completed
        if: success()
        run: |
          node scripts/update-job.js \
            --status="completed" \
            --video-url="${{ steps.upload.outputs.video_url }}"
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
          API_SECRET: ${{ secrets.API_SECRET }}

      - name: Update database — failed
        if: failure()
        run: |
          node scripts/update-job.js \
            --status="failed" \
            --error="Render job failed. Check GitHub Actions logs."
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
          API_SECRET: ${{ secrets.API_SECRET }}
```

---

## Trigger dari Next.js API

```typescript
// app/api/projects/[id]/generate/route.ts

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { mode = 'full', scene_ids } = await req.json()

  // Buat render job di database
  const job = await createRenderJob({ project_id: params.id, mode, scene_ids })

  // Dispatch GitHub Actions
  await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: 'render_video',
      client_payload: {
        project_id: params.id,
        job_id: job.id,
        mode,
        scene_ids: scene_ids ?? null,
      },
    }),
  })

  return Response.json({ job_id: job.id })
}
```

---

## Secrets yang Dibutuhkan

Semua secret dikonfigurasi di **GitHub → Repository → Settings → Secrets and variables → Actions**

| Secret | Keterangan |
|---|---|
| `API_BASE_URL` | Base URL Next.js API (contoh: `https://storyz.app`) |
| `API_SECRET` | Secret key untuk autentikasi internal antara runner dan API |
| `NINE_ROUTER_API_KEY` | API key untuk 9Router (AI provider) |
| `BLOB_READ_WRITE_TOKEN` | Token Blob storage untuk upload video final |

Environment variable yang dikonfigurasi di **Vercel** (untuk Next.js API):

| Variable | Keterangan |
|---|---|
| `GITHUB_TOKEN` | Personal Access Token dengan scope `repo` untuk dispatch workflow |
| `GITHUB_REPO` | Format: `username/repo-name` |
| `DATABASE_URL` | Connection string Neon PostgreSQL |
| `NINE_ROUTER_API_KEY` | API key untuk 9Router |

---

## Scripts di Repository

```
scripts/
  fetch-storyboard.js    → Ambil storyboard JSON dari API, simpan ke ./storyboard.json
  generate-images.js     → Generate gambar per scene via 9Router
  generate-voices.js     → Generate voice per scene via 9Router
  mux.js                 → FFmpeg: gabung frames + audio → MP4
  upload.js              → Upload MP4 ke Blob storage
  update-job.js          → PATCH /api/render-jobs/:id dengan status dan hasil
```

---

## Update Job API (dipanggil oleh runner)

```typescript
// app/api/render-jobs/[id]/route.ts

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  // Validasi API_SECRET dari header
  const secret = req.headers.get('x-api-secret')
  if (secret !== process.env.API_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { status, video_url, error } = await req.json()

  await db.query(
    `UPDATE render_jobs SET status = $1, video_url = $2, error = $3,
     completed_at = CASE WHEN $1 = 'completed' THEN now() ELSE NULL END
     WHERE id = $4`,
    [status, video_url ?? null, error ?? null, params.id]
  )

  // Jika completed, update status project
  if (status === 'completed') {
    await db.query(
      `UPDATE projects SET status = 'rendered' WHERE id =
       (SELECT project_id FROM render_jobs WHERE id = $1)`,
      [params.id]
    )
  }

  return Response.json({ ok: true })
}
```

---

## Error Handling

- Setiap step di workflow menggunakan `if: failure()` untuk update database ke status `failed`
- Runner timeout dikonfigurasi ke 60 menit — jika melebihi, job otomatis di-cancel dan bisa di-retry
- Frontend polling akan mendeteksi status `failed` dan menampilkan pesan error + tombol retry
- Log GitHub Actions dapat diakses langsung dari GitHub untuk debugging
