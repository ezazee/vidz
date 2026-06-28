# WORKFLOW.md

> Penjelasan detail setiap tahap dalam pipeline StoryZ — input, output, trigger, dan cara kerja saat ini.

---

## Overview Pipeline (Current State)

```
User input topik
      │
      ▼
POST /api/projects/:id/pipeline
      │
      ▼
GitHub Actions: ai_pipeline.yml
      │
      ├── [1] Research      → AI riset topik
      ├── [2] Director      → AI buat director bible
      ├── [3] Outline       → AI buat struktur video
      ├── [4] Scenes        → AI buat 42 adegan (narasi, prompt, dll)
      ├── [5] SEO           → AI buat title, desc, tags, hashtags
      └── [6] Thumbnail     → AI generate gambar thumbnail → upload R2
            │
            ▼
      curl POST /api/projects/:id/generate
            │
            ▼
      GitHub Actions: render.yml
            │
            ├── Generate images per scene (AI + Pexels stock)
            ├── Generate voice TTS per scene
            ├── Render Remotion (paralel per chunk)
            ├── FFmpeg merge semua chunk
            └── Upload MP4 → Cloudflare R2 → update DB
```

---

## Stage 1 — Research

**Input:** `topic` dari project

**Output:** `summary`, `facts[]`, `timeline[]`, `references[]` → tabel `research`

**AI Module:** `lib/ai/research.ts`

**Detail:**
- DuckDuckGo scrape (optional, 8s timeout) untuk konteks terkini
- Jika scrape gagal/timeout → AI tetap jalan dengan pengetahuan internal
- Output: JSON dengan 8–12 fakta spesifik + timeline kronologis

---

## Stage 2 — Director Engine

**Input:** `topic`, output research

**Output:** Director bibles → tabel `director`

**AI Module:** `lib/ai/director.ts`

**Kolom yang disimpan:**
| Kolom | Isi |
|---|---|
| `genre` | Genre dokumenter |
| `visual_style` | Deskripsi gaya visual keseluruhan |
| `voice_style` | Panduan gaya narasi/voice |
| `image_style` | Panduan style gambar AI |
| `camera_style` | Panduan gerakan kamera |
| `transition` | Jenis transisi default |
| `emotion` | Tone emosional keseluruhan |
| `visual_bible` | Detail visual style lengkap (JSON) |
| `character_bible` | Panduan konsistensi karakter (JSON) |
| `environment_bible` | Panduan environment & setting (JSON) |
| `camera_bible` | Panduan kamera detail (JSON) |
| `motion_bible` | Panduan motion & effect (JSON) |
| `thumbnail_bible` | Panduan style thumbnail (JSON) |

---

## Stage 3 — Outline

**Input:** `topic`, `research.summary`

**Output:** Struktur 5 sections → tabel `outlines`

**AI Module:** `lib/ai/outline.ts`

**Struktur fixed:**
```json
{
  "sections": [
    { "type": "intro",   "title": "...", "order": 0, "description": "..." },
    { "type": "chapter", "title": "...", "order": 1, "description": "..." },
    { "type": "chapter", "title": "...", "order": 2, "description": "..." },
    { "type": "chapter", "title": "...", "order": 3, "description": "..." },
    { "type": "ending",  "title": "...", "order": 4, "description": "..." }
  ]
}
```

---

## Stage 4 — Scenes

**Input:** Semua sections outline, director bibles, topic

**Output:** 42 adegan → tabel `scenes`

**AI Module:** `lib/ai/scenes.ts`

**Jumlah scene per section:**
- `intro` → 6 scenes
- `chapter` → 10 scenes × 3 = 30 scenes
- `ending` → 6 scenes
- **Total: 42 scenes**

**Target durasi video:** 8–10 menit (42 × 11 detik rata-rata)

**Per scene tersimpan:**
| Kolom | Isi |
|---|---|
| `order_index` | Urutan scene |
| `narration` | Narasi bahasa Indonesia (20–35 kata) |
| `subtitle` | Versi pendek narasi (max 10 kata) |
| `image_prompt` | Prompt bahasa Inggris untuk AI image generator |
| `camera` | Gerakan kamera |
| `effect` | Visual effect |
| `emotion` | Tone emosional scene |
| `transition` | Jenis transisi ke scene berikutnya |
| `duration` | Durasi scene (10–13 detik) |
| `image_status` | `idle` / `processing` / `completed` / `failed` |
| `voice_status` | `idle` / `processing` / `completed` / `failed` |

---

## Stage 5 — SEO

**Input:** `topic`, `research.summary`, narasi semua scenes

**Output:** Metadata SEO → tabel `seo_metadata`

**AI Module:** `lib/ai/seo.ts`

**Output:** `title`, `description`, `tags[]`, `hashtags[]`

---

## Stage 6 — Thumbnail (Auto)

**Input:** `director.thumbnail_bible.composition`

**Output:** Gambar thumbnail 1792×1024 → upload R2 → tabel `thumbnails`

**Proses:**
1. Ambil prompt dari `thumbnail_bible`
2. Kirim ke AI Image Generator (Stable Diffusion XL)
3. Upload ke Cloudflare R2
4. Simpan URL ke tabel `thumbnails`

---

## Stage 7 — Render (GitHub Actions: render.yml)

**Trigger:** `POST /api/projects/:id/generate` → dispatch `render_video` event

**Proses:**

```
prepare job:
  1. fetch-storyboard.js     → ambil storyboard JSON dari API
  2. fetch-pexels.js         → download stock video dari Pexels (per scene)
  3. generate-images.js      → generate AI image per scene (atau skip jika ada Pexels)
  4. generate-voices.js      → generate TTS voice per scene (ElevenLabs/Azure)
  5. prepare-chunks.js       → bagi scenes menjadi chunk untuk render paralel

render job (paralel matrix):
  6. Remotion render per chunk → output MP4 per part

merge job:
  7. merge-chunks.js         → FFmpeg gabung semua part
  8. upload.js               → upload MP4 final ke Cloudflare R2
  9. update-job.js           → PATCH /api/render-jobs/:id { status: 'completed', video_url }
```

---

## Stage 8 — YouTube Upload (Manual / Auto Schedule)

**Trigger:** Tombol "Publish" di web, atau jadwal otomatis (cron via cron-job.org)

**API:** `POST /api/projects/:id/publish`

**Fitur:**
- Upload video MP4 dari R2
- Set thumbnail
- Set title, description, tags (dari SEO metadata)
- Set jadwal publish (opsional)

---

## AI Client

**File:** `lib/ai/client.ts`

**Model:** `groq/llama-3.3-70b-versatile` via 9Router gateway  
**Response time:** < 1 detik  
**Timeout:** 5 menit (300 detik) — aman untuk GitHub Actions runner  
**Image model:** `cf/@cf/stabilityai/stable-diffusion-xl-base-1.0`

---

## Error Handling

| Situasi | Penanganan |
|---|---|
| DuckDuckGo scrape gagal | Non-fatal, AI tetap jalan tanpa konteks web |
| AI stage gagal | Log error, status `failed` di DB, user bisa retry |
| Thumbnail gagal | Non-fatal, pipeline tetap dianggap sukses |
| Render gagal | PATCH job status `failed`, runner kirim error message |
| Vercel timeout | Tidak mungkin terjadi — AI pipeline jalan di GitHub Actions |