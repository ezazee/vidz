# ROADMAP.md

> Rencana pengembangan StoryZ dari Phase 1 (core) hingga Phase 4 (studio features).

---

## Phase 1 — Core Engine

**Target:** Aplikasi dapat generate video YouTube end-to-end secara otomatis.

### Features

- [ ] Project management (buat, lihat, hapus project)
- [ ] Research AI — riset topik otomatis
- [ ] Director Engine — generate semua bible
- [ ] Outline Generator
- [ ] Script Generator (per section)
- [ ] Storyboard Generator (per scene)
- [ ] Image Prompt Generator
- [ ] Image Generation via GitHub Actions
- [ ] Voice Generation via GitHub Actions
- [ ] Rendering via Remotion + FFmpeg di GitHub Actions
- [ ] Thumbnail Generator
- [ ] SEO Generator
- [ ] YouTube Upload (manual trigger)
- [ ] Frontend: dashboard project + progress pipeline
- [ ] Frontend: preview storyboard per scene
- [ ] Frontend: regenerate per stage
- [ ] Polling job status (TanStack Query)

### Acceptance criteria Phase 1

- Video 10–15 menit berhasil di-generate end-to-end tanpa intervensi manual
- Konsistensi visual terjaga (style tidak berubah antar scene)
- Setiap tahap dapat di-regenerate secara independen
- Video berhasil di-upload ke YouTube dengan metadata lengkap

---

## Phase 2 — Advanced Motion

**Target:** Video terlihat lebih sinematik dengan efek motion yang lebih kaya.

### Features

- [ ] Parallax effect (multi-layer depth compositing)
- [ ] Camera shake (noise-based jitter)
- [ ] Fog overlay (animated opacity)
- [ ] Rain particle system
- [ ] Snow particle system
- [ ] Light rays overlay
- [ ] Custom particle engine
- [ ] Improved transition library (lebih dari fade/cut)
- [ ] Background music auto-selection berdasarkan emosi Director

---

## Phase 3 — Automation

**Target:** StoryZ dapat berjalan sepenuhnya otomatis tanpa intervensi user.

### Features

- [ ] Auto upload ke YouTube setelah render selesai
- [ ] Scheduling — publish otomatis pada waktu tertentu
- [ ] Playlist management — assign video ke playlist otomatis
- [ ] Multi-language support — generate script dalam beberapa bahasa sekaligus
- [ ] Batch project — generate beberapa video sekaligus dari satu daftar topik
- [ ] Topic discovery otomatis — AI mencari topik trending

---

## Phase 4 — Studio Features

**Target:** StoryZ menjadi platform yang dapat digunakan oleh tim dan dijual ke publik.

### Features

- [ ] Multiple visual templates (pilih preset style sebelum Director run)
- [ ] Team workspace — beberapa user dalam satu workspace
- [ ] Prompt marketplace — jual/beli Director template dan prompt pack
- [ ] Analytics — view count, CTR thumbnail, retention dari YouTube Analytics
- [ ] AI Quality Review — AI menilai kualitas video sebelum upload
- [ ] Custom voice cloning — upload sample suara, AI mengkloning untuk voice over
- [ ] Brand kit — logo, color, font yang selalu dimasukkan ke setiap video

---

## Tech Debt & Improvements (ongoing)

- [ ] Unit test untuk semua AI wrapper (`lib/ai/*.ts`)
- [ ] Integration test untuk pipeline end-to-end
- [ ] Rate limiting untuk API endpoints
- [ ] Auth — user authentication (Clerk atau NextAuth)
- [ ] Billing — usage tracking dan limit per plan
- [ ] Observability — logging dan monitoring (Sentry, Axiom)
- [ ] CI/CD pipeline untuk deployment otomatis ke Vercel

---

## Version History

| Version | Status | Highlights |
|---|---|---|
| 1.0.0 | Planning | Initial documentation, architecture design |