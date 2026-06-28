# ENVIRONMENT.md

> Panduan environment variables StoryZ — untuk Vercel, local development, dan GitHub Secrets.

---

## Vercel Environment Variables

Set di: **Vercel → Project Settings → Environment Variables**

| Variable | Wajib | Deskripsi |
|---|---|---|
| `DATABASE_URL` | ✅ | Connection string Neon PostgreSQL |
| `GITHUB_TOKEN` | ✅ | GitHub Personal Access Token (scope: `repo`) |
| `GITHUB_REPO` | ✅ | Format: `owner/repo` (contoh: `ezazee/vidz`) |
| `API_SECRET` | ✅ | Secret token antara Vercel ↔ GitHub Actions runner |
| `API_BASE_URL` | ✅ | URL production app (contoh: `https://vidz-factory.vercel.app`) |
| `AI_BASE_URL` | ✅ | Base URL AI gateway (contoh: `https://creavoo-9router.fly.dev/v1`) |
| `AI_API_KEY` | ✅ | API key untuk AI gateway |
| `AI_MODEL` | ✅ | Nama model AI (gunakan: `groq/llama-3.3-70b-versatile`) |
| `IMAGE_MODEL` | ✅ | Model untuk generate gambar (contoh: `cf/@cf/stabilityai/stable-diffusion-xl-base-1.0`) |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare R2 Account ID |
| `R2_ACCESS_KEY_ID` | ✅ | Cloudflare R2 Access Key |
| `R2_SECRET_ACCESS_KEY` | ✅ | Cloudflare R2 Secret Key |
| `R2_BUCKET_NAME` | ✅ | Nama bucket R2 |
| `R2_PUBLIC_URL` | ✅ | URL publik R2 (contoh: `https://pub-xxx.r2.dev`) |
| `NINE_ROUTER_BASE_URL` | ⬜ | Fallback AI gateway URL |
| `NINE_ROUTER_API_KEY` | ⬜ | Fallback AI gateway API key |
| `TTS_VOICE` | ⬜ | Voice ID untuk TTS (contoh: `id-ID-ArdiNeural`) |
| `PEXELS_API_KEY` | ⬜ | API key Pexels untuk stock video |
| `BLOB_READ_WRITE_TOKEN` | ⬜ | Vercel Blob token (legacy, tidak dipakai aktif) |
| `NEXT_PUBLIC_GITHUB_REPO` | ⬜ | Repo name untuk ditampilkan di UI |

---

## GitHub Actions Secrets

Set di: **GitHub → repo → Settings → Secrets and variables → Actions → New repository secret**

Secrets ini digunakan oleh dua workflow:
- `ai_pipeline.yml` — menjalankan AI pipeline di runner
- `render.yml` — menjalankan render video di runner

| Secret | Dipakai oleh | Deskripsi |
|---|---|---|
| `DATABASE_URL` | ai_pipeline.yml | Connection string Neon PostgreSQL |
| `AI_API_KEY` | ai_pipeline.yml, render.yml | API key AI gateway |
| `AI_BASE_URL` | ai_pipeline.yml, render.yml | Base URL AI gateway |
| `AI_MODEL` | ai_pipeline.yml | Model AI (`groq/llama-3.3-70b-versatile`) |
| `IMAGE_MODEL` | ai_pipeline.yml, render.yml | Model untuk image generation |
| `API_BASE_URL` | render.yml | URL Vercel app untuk callback |
| `API_SECRET` | render.yml | Secret untuk autentikasi API internal |
| `PEXELS_API_KEY` | render.yml | API key Pexels |
| `R2_ACCOUNT_ID` | ai_pipeline.yml, render.yml | Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | ai_pipeline.yml, render.yml | Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | ai_pipeline.yml, render.yml | Cloudflare R2 |
| `R2_BUCKET_NAME` | ai_pipeline.yml, render.yml | Cloudflare R2 |
| `R2_PUBLIC_URL` | ai_pipeline.yml, render.yml | URL publik R2 |
| `TTS_VOICE` | render.yml | Voice ID untuk TTS |
| `BLOB_READ_WRITE_TOKEN` | render.yml (legacy) | Vercel Blob |

---

## Local Development (.env)

Copy dari `.env.example` lalu isi:

```bash
# Database
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Internal
API_SECRET=random-secret-string
API_BASE_URL=http://localhost:3000

# GitHub
GITHUB_TOKEN=ghp_xxxxx
GITHUB_REPO=owner/repo
NEXT_PUBLIC_GITHUB_REPO=owner/repo

# AI Gateway (9Router)
AI_BASE_URL=https://creavoo-9router.fly.dev/v1
AI_API_KEY=sk-xxxxx
AI_MODEL=groq/llama-3.3-70b-versatile
IMAGE_MODEL=cf/@cf/stabilityai/stable-diffusion-xl-base-1.0

# TTS
TTS_VOICE=id-ID-ArdiNeural

# Cloudflare R2
R2_ACCOUNT_ID=xxxxx
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx
R2_BUCKET_NAME=vidz-factory
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Pexels
PEXELS_API_KEY=xxxxx
```

---

## Catatan Penting

### AI Model
Gunakan **`groq/llama-3.3-70b-versatile`** — response time < 1 detik via 9Router gateway.
**Jangan** pakai `creavoo-combo` karena sering hang tanpa batas waktu.

### DATABASE_URL di GitHub Secrets
Nilai `DATABASE_URL` dari Neon biasanya mengandung karakter `&` di query string.  
Ini aman di GitHub Secrets — langsung paste as-is.

### GITHUB_TOKEN
Token harus punya permission untuk `repository_dispatch`.  
Di GitHub → Settings → Developer settings → Personal access tokens → pilih scope `repo` (classic) atau permission `Actions: Read & Write` (fine-grained).

### AI Pipeline vs Vercel
**Jangan** jalankan AI pipeline langsung di Vercel serverless functions — Vercel Hobby plan memiliki batas waktu 60 detik yang tidak cukup.
Pipeline AI selalu harus melalui GitHub Actions (`ai_pipeline.yml`).
