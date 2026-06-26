# ARCHITECTURE.md

> Arsitektur sistem StoryZ secara menyeluruh — request flow, komponen utama, dan batas tanggung jawab tiap layer.

---

## High-Level Architecture

```
User (Browser)
    │
    ▼
Vercel (Next.js)
    │
    ├── Frontend (React + Tailwind)
    │
    └── API Routes (Next.js)
            │
            ├── Neon PostgreSQL
            │       (project state, scenes, assets, jobs)
            │
            ├── 9Router (AI calls)
            │       (research, script, image prompt, SEO, dll)
            │
            └── GitHub Actions (dispatch)
                    │
                    └── GitHub Runner
                            │
                            ├── Generate Assets (image, voice)
                            ├── Render Video (Remotion + FFmpeg)
                            ├── Upload hasil ke Storage
                            └── Update Database → trigger polling
```

---

## Layer Responsibilities

### Frontend (Next.js App Router)

- Menampilkan project dashboard, progress pipeline, dan preview per-scene
- Polling status job via TanStack Query (interval: 3–5 detik)
- Memungkinkan user trigger regenerate di setiap tahap
- Menampilkan preview storyboard, gambar, subtitle, dan video hasil render

### API Routes

- Menerima request dari frontend
- Memanggil AI wrapper yang sesuai
- Menyimpan hasil ke PostgreSQL
- Men-dispatch GitHub Actions workflow untuk rendering
- Mengembalikan job ID untuk keperluan polling

### Director Engine

- Dipanggil setelah Research selesai
- Menghasilkan semua "bible" yang digunakan oleh seluruh modul AI downstream
- Output disimpan sebagai JSON di database dan digunakan oleh Prompt Generator, Script Generator, dll.

### GitHub Actions Runner

- Menerima `repository_dispatch` event dengan payload project ID
- Mengambil storyboard JSON dari database
- Generate gambar dan voice per scene
- Render video menggunakan Remotion + FFmpeg
- Upload hasil ke storage
- PATCH database dengan URL hasil dan status `completed`

### Database (Neon PostgreSQL)

- Single source of truth untuk seluruh state project
- Semua AI output disimpan sebagai JSON column
- Status job (pending / processing / completed / failed) tersimpan per tahap

---

## Request Flow — Generate Video

```
1. User input topik
        │
2. API: Research AI → simpan ke DB
        │
3. API: Director Engine → simpan Visual Bible ke DB
        │
4. API: Outline Generator → simpan ke DB
        │
5. API: Script Generator (per chapter) → simpan ke DB
        │
6. API: Storyboard Generator → simpan scenes[] ke DB
        │
7. API: Prompt Generator (per scene) → simpan ke DB
        │
8. API: dispatch GitHub Actions dengan project_id
        │
9. GitHub Runner:
        ├── Generate image per scene
        ├── Generate voice per scene
        ├── Render video (Remotion + FFmpeg)
        ├── Generate thumbnail
        └── Upload ke Storage
        │
10. Runner: PATCH /api/jobs/:id → status = completed, video_url = ...
        │
11. Frontend: polling deteksi completed → tampilkan video
```

---

## Polling Strategy

Frontend menggunakan TanStack Query dengan `refetchInterval` untuk memantau status job.

```typescript
const { data } = useQuery({
  queryKey: ['job', jobId],
  queryFn: () => fetchJobStatus(jobId),
  refetchInterval: (data) =>
    data?.status === 'completed' || data?.status === 'failed' ? false : 4000,
})
```

---

## Regenerate Strategy

Setiap tahap menyimpan output ke kolom terpisah di database. Regenerate satu tahap hanya menimpa kolom yang bersangkutan dan menjalankan ulang tahap downstream yang bergantung padanya.

```
Regenerate scene image #12
    → Hapus image URL scene #12
    → Dispatch GitHub Actions: generate_image job (scene_id: 12)
    → Render ulang hanya scene #12
    → Update database
    → Frontend polling → tampilkan gambar baru
```

---

## Deployment Architecture

```
Branch: main
    │
    └── Vercel auto-deploy
            (preview per PR, production per merge ke main)

Database:
    Neon PostgreSQL — connection pooling via @neondatabase/serverless

Rendering:
    GitHub Actions workflow: render.yml
    Trigger: repository_dispatch (event: render_video)
    Payload: { project_id, scene_ids?, mode: 'full' | 'partial' }
```