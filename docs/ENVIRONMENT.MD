# ENVIRONMENT.md

> Checklist environment variable StoryZ, disusun per fitur supaya bisa diisi bertahap.

---

## Isi Paling Awal

Untuk development lokal awal, mulai dari ini dulu:

```bash
DATABASE_URL=
API_SECRET=
API_BASE_URL=http://localhost:3000
```

| Variable | Wajib kapan? | Isi dengan |
|---|---|---|
| `DATABASE_URL` | Saat test API project/research/director | Connection string Neon PostgreSQL |
| `API_SECRET` | Saat runner/script memanggil API internal | Random long secret |
| `API_BASE_URL` | Saat GitHub Actions atau script lokal callback ke API | URL app, lokal atau Vercel |

---

## Fitur 1 — Project Management

Endpoint:

- `POST /api/projects`

Env yang dibutuhkan:

```bash
DATABASE_URL=
```

Catatan:

- Perlu menjalankan `migrations/001_init.sql` di Neon/PostgreSQL terlebih dahulu.

---

## Fitur 2 — Research AI

Endpoint:

- `POST /api/projects/[id]/research`

Env yang dibutuhkan sekarang:

```bash
DATABASE_URL=
```

Env yang akan dibutuhkan saat AI asli diaktifkan:

```bash
NINE_ROUTER_BASE_URL=
NINE_ROUTER_API_KEY=
```

Status implementasi:

- Saat ini masih placeholder, belum call 9Router.

---

## Fitur 3 — Director Engine

Endpoint:

- `POST /api/projects/[id]/director`

Env yang dibutuhkan sekarang:

```bash
DATABASE_URL=
```

Env yang akan dibutuhkan saat AI asli diaktifkan:

```bash
NINE_ROUTER_BASE_URL=
NINE_ROUTER_API_KEY=
```

Status implementasi:

- Saat ini masih placeholder typed output.

---

## Fitur 4 — Storyboard JSON

Endpoint:

- `GET /api/projects/[id]/storyboard`

Env yang dibutuhkan:

```bash
DATABASE_URL=
API_SECRET=
```

Catatan:

- `API_SECRET` dipakai untuk melindungi endpoint saat dipanggil runner.

---

## Fitur 5 — Dispatch GitHub Actions Render

Endpoint:

- `POST /api/projects/[id]/generate`

Env di Vercel/lokal app:

```bash
DATABASE_URL=
GITHUB_TOKEN=
GITHUB_REPO=
```

Env di GitHub Actions secrets:

```bash
API_BASE_URL=
API_SECRET=
```

Catatan:

- `GITHUB_TOKEN` butuh permission untuk `repository_dispatch`.
- `GITHUB_REPO` formatnya `owner/repo`.

---

## Fitur 6 — GitHub Actions Runner

Files:

- `.github/workflows/render.yml`
- `scripts/fetch-storyboard.js`
- `scripts/update-job.js`

Env dari GitHub Actions payload:

```bash
PROJECT_ID=
JOB_ID=
MODE=
SCENE_IDS=
```

Secrets yang harus ada di GitHub:

```bash
API_BASE_URL=
API_SECRET=
```

Status implementasi:

- Fetch storyboard dan update job sudah ada.
- Generate image, voice, upload storage masih placeholder.

---

## Fitur 7 — 9Router AI Gateway

Env:

```bash
NINE_ROUTER_BASE_URL=
NINE_ROUTER_API_KEY=
```

Dipakai untuk:

- Research AI
- Director Engine
- Script Generator
- Storyboard Generator
- Image Prompt Generator
- Image Generation
- Voice Generation
- Thumbnail Generator
- SEO Generator

Status implementasi:

- Belum dihubungkan ke wrapper AI.

---

## Fitur 8 — Blob Storage

Env:

```bash
BLOB_READ_WRITE_TOKEN=
```

Dipakai untuk:

- Upload MP4 final
- Nanti bisa dipakai untuk image, voice, thumbnail

Status implementasi:

- Masih placeholder di `scripts/upload.js`.

---

## Urutan Isi Env yang Disarankan

1. `DATABASE_URL`
2. `API_SECRET`
3. `API_BASE_URL`
4. `NINE_ROUTER_BASE_URL`
5. `NINE_ROUTER_API_KEY`
6. `GITHUB_REPO`
7. `GITHUB_TOKEN`
8. `BLOB_READ_WRITE_TOKEN`
