# Changelog

Semua perubahan penting di project ini tercatat di file ini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/),
dan project ini mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Planned
- Hardening fallback topik di n8n (BrainWhy & Cerita Tetangga) biar gak jatuh ke pool statis
- Stabilisasi API `/api/recommendations` (timeout / retry)

## [1.1.0] - 2026-07-27

### Fixed
- **[VID-1] Error 409 Topik Duplikat di workflow BrainWhy & Cerita Tetangga**
  - Endpoint `POST /api/projects` sebelumnya langsung return `409 Conflict` kalau topik sudah pernah dibuat
  - Pipeline n8n untuk channel BrainWhy & Cerita Tetangga berhenti total karena error ini
  - Sekarang backend **otomatis memvariasikan judul** bila topik terdeteksi duplikat:
    - Contoh: `Topik A` → `Topik A (1)` → `Topik A (2)` … (maks. 10 percobaan)
  - Tag `[THEME: ...]` tetap dipertahankan di akhir judul
  - Response API sekarang menyertakan flag:
    - `topicVaried: boolean` — `true` kalau judul diubah
    - `originalTopic: string` — topik asli dari request

### Changed
- Versi project di-bump dari `0.1.0` → `1.1.0` (minor release — backward-compatible fix)

### Files Changed
| File | Perubahan |
|------|-----------|
| `app/api/projects/route.ts` | Logic anti-duplikat + auto-variation topik |
| `package.json` | Bump version `0.1.0` → `1.1.0` |
| `CHANGELOG.md` | File ini (baru) |

### How to Verify
```bash
# Kirim topik yang sudah pernah dibuat → harus 201 (bukan 409)
# Response body harus punya topicVaried: true
curl -X POST "https://vidz-factory.vercel.app/api/projects" \
  -H "Content-Type: application/json" \
  -H "x-api-secret: <SECRET>" \
  -H "x-channel-id: brainwhy" \
  -d '{"topic":"Why You Can'\''t Stop Checking Your Phone (Even When You Want To)"}'
```

### Migration / Deploy Notes
- **Tidak ada migrasi DB**
- Deploy dari branch `dev` dulu (staging), verifikasi, baru promote ke production
- Setelah live, workflow n8n BrainWhy & Cerita Tetangga harus lanjut tanpa error 409

## [0.1.0] - Initial Release

### Added
- Core pipeline produksi video multi-channel (Cabang Sejarah, BrainWhy, Cerita Tetangga)
- API project, render, publish, analytics, recommendations
