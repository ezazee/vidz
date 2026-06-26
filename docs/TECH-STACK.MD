# TECH_STACK.md

> Referensi lengkap seluruh teknologi yang digunakan dalam StoryZ beserta alasan pemilihan dan constraint penting.

---

## Frontend

| Teknologi | Versi | Alasan |
|---|---|---|
| Next.js | Latest Stable | App Router, SSR, API Routes dalam satu framework |
| React | Latest Stable | Ekosistem luas, kompatibel dengan Next.js |
| TypeScript | Latest Stable | Type safety, DX lebih baik, refactor aman |
| Tailwind CSS | Latest Stable | Utility-first, tidak perlu CSS file terpisah |
| shadcn/ui | Latest Stable | Komponen accessible, customizable, tidak opinionated |
| TanStack Query | Latest Stable | Server state management, caching, polling |
| React Hook Form | Latest Stable | Form handling performant, minimal re-render |
| Zod | Latest Stable | Schema validation, integrasi dengan RHF dan API |

---

## Backend

| Keputusan | Detail |
|---|---|
| Framework | Next.js API Routes — tidak ada server terpisah |
| Tidak menggunakan | NestJS, Express, Fastify |
| Runtime | Node.js via Vercel serverless functions |
| Deployment | Vercel |

### Constraint penting

- Semua endpoint berada di `app/api/` dalam struktur Next.js App Router
- Tidak ada long-running process di Vercel — rendering didelegasikan ke GitHub Actions
- Timeout Vercel default: 10 detik (Pro: 60 detik) — endpoint berat harus async + polling

---

## Database

| Keputusan | Detail |
|---|---|
| Database | PostgreSQL via Neon (serverless) |
| Driver | `postgres` (node-postgres) |
| ORM | **Tidak ada** — native SQL only |
| Migration | Manual SQL files |

### Alasan tidak menggunakan ORM

- Query kompleks lebih mudah dikontrol langsung via SQL
- Performa predictable tanpa magic query builder
- Tidak ada overhead abstraksi untuk relasi antar tabel yang kompleks

---

## AI Provider

| Keputusan | Detail |
|---|---|
| Gateway | 9Router |
| Integrasi | Wrapper internal per modul AI |
| Model switching | Ganti model tanpa ubah business logic |

### Wrapper internal yang dibutuhkan

```
/lib/ai/
  research.ts         → Research Generator
  director.ts         → Director Engine
  script.ts           → Script Generator
  storyboard.ts       → Storyboard Generator
  image-prompt.ts     → Image Prompt Generator
  image.ts            → Image Generator
  voice.ts            → Voice Generator
  thumbnail.ts        → Thumbnail Generator
  seo.ts              → SEO Generator
```

Setiap wrapper menerima input standar dan mengembalikan output bertipe, sehingga model AI di belakang dapat diganti tanpa menyentuh kode yang memanggilnya.

---

## Rendering

| Teknologi | Fungsi |
|---|---|
| Remotion | Komposisi video berbasis React |
| FFmpeg | Encoding, muxing audio + video |
| Sharp | Pemrosesan gambar (resize, composite, optimize) |
| GitHub Actions | Runner untuk rendering — biaya $0 |

### Alasan menggunakan GitHub Actions sebagai renderer

- Tidak perlu server dedicated untuk rendering
- GitHub Actions menyediakan runner dengan resource cukup untuk Remotion + FFmpeg
- Rendering dipicu via `repository_dispatch` dari Next.js API
- Hasil upload langsung ke storage, kemudian database di-update

---

## Storage

| Environment | Provider |
|---|---|
| Current | Temporary GitHub Runner storage |
| Future | Blob |

---

## Deployment

| Layer | Provider |
|---|---|
| Frontend + API | Vercel |
| Database | Neon PostgreSQL |
| Rendering | GitHub Actions |
| Storage | Blob |
