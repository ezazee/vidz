# WORKFLOW.md

> Penjelasan detail setiap tahap dalam pipeline StoryZ — input, output, trigger, dan error handling.

---

## Overview Pipeline

```
Topic
  └─ Research
       └─ Director Engine
            └─ Outline
                 └─ Script (per section)
                      └─ Storyboard (per scene)
                           └─ Prompt Generation (per scene)
                                └─ Image Generation (per scene)  ─┐
                                └─ Voice Generation (per scene)  ─┤
                                                                   ▼
                                                              Rendering
                                                                   │
                                                              Thumbnail
                                                                   │
                                                                  SEO
                                                                   │
                                                            YouTube Upload
```

---

## Stage 1 — Topic Discovery

**Input:** String topik dari user (contoh: "Kisah Jatuhnya Kerajaan Majapahit")

**Output:** Topik tersimpan di tabel `projects`

**API endpoint:** `POST /api/projects`

```typescript
// Request
{ topic: string }

// Response
{ project_id: string }
```

---

## Stage 2 — Research

**Input:** `project_id`, `topic`

**Output:** `summary`, `facts[]`, `timeline[]`, `references[]` tersimpan di tabel `research`

**API endpoint:** `POST /api/projects/:id/research`

**AI module:** `lib/ai/research.ts`

**Error handling:**
- Jika AI timeout → set status `failed`, simpan error message
- Dapat di-retry tanpa menghapus data project

---

## Stage 3 — Director Engine

**Input:** `project_id`, output research

**Output:** Seluruh "bible" tersimpan di tabel `director`:
- `visual_bible` — deskripsi style visual keseluruhan
- `character_bible` — panduan konsistensi karakter
- `environment_bible` — panduan environment & setting
- `camera_bible` — panduan gerakan kamera
- `motion_bible` — panduan motion & transisi
- `thumbnail_bible` — panduan style thumbnail

**API endpoint:** `POST /api/projects/:id/director`

**Catatan penting:** Semua modul AI downstream **wajib** membaca output Director sebelum generate. Director adalah kontrak visual yang mengikat.

---

## Stage 4 — Outline

**Input:** `project_id`, output research, output director

**Output:** Struktur video dengan section: intro, chapter_1..N, ending

**API endpoint:** `POST /api/projects/:id/outline`

**Contoh output:**

```json
{
  "sections": [
    { "type": "intro",   "title": "Kejayaan Majapahit", "order": 0 },
    { "type": "chapter", "title": "Awal Keruntuhan",    "order": 1 },
    { "type": "chapter", "title": "Perang Saudara",     "order": 2 },
    { "type": "chapter", "title": "Invasi Demak",       "order": 3 },
    { "type": "ending",  "title": "Warisan yang Tersisa","order": 4 }
  ]
}
```

---

## Stage 5 — Script

**Input:** `project_id`, satu section outline, output director

**Output:** Teks narasi untuk section tersebut

**API endpoint:** `POST /api/projects/:id/scripts`

**Catatan:** Script di-generate **per section secara independen**. Ini memungkinkan regenerate satu chapter tanpa mengganggu chapter lain.

---

## Stage 6 — Storyboard

**Input:** `project_id`, semua script, output director

**Output:** Array scene, masing-masing tersimpan sebagai baris di tabel `scenes`

**API endpoint:** `POST /api/projects/:id/storyboard`

**Contoh satu scene:**

```json
{
  "order_index": 0,
  "narration": "Di puncak kejayaannya, Majapahit menguasai hampir seluruh Nusantara.",
  "image_prompt": "Wide aerial view of a grand ancient Javanese kingdom...",
  "camera": "zoom_out",
  "duration": 7.5,
  "subtitle": "Puncak kejayaan Majapahit",
  "effect": "light_rays",
  "emotion": "epic",
  "transition": "fade"
}
```

---

## Stage 7 — Prompt Generation

**Input:** `scene.narration`, `scene.emotion`, output director (semua bible)

**Output:** Image prompt final per scene, disimpan ke kolom `image_prompt` di tabel `scenes`

**Struktur prompt:**

```
[Base description dari narasi]
+ [Director: visual_style]
+ [Director: character_bible jika ada karakter]
+ [Director: environment_bible]
+ [Director: lighting]
+ [Director: color_palette]
```

---

## Stage 8 — Image & Voice Generation (paralel via GitHub Actions)

**Input:** Semua scene dengan `image_prompt` yang sudah final

**Output:**
- `image_url` per scene → update kolom `scenes.image_url`
- `voice_url` per scene → update kolom `scenes.voice_url`

**Trigger:** `POST /api/projects/:id/generate` → dispatch `repository_dispatch` ke GitHub Actions

**Mode:**
- `full` → generate semua scene
- `partial` → generate hanya `scene_ids[]` yang diberikan (untuk regenerate)

---

## Stage 9 — Rendering

**Input:** Semua scene dengan `image_url` dan `voice_url` tersedia

**Output:** File MP4 video final

**Tools:** Remotion + FFmpeg

**Trigger:** Lanjutan GitHub Actions setelah image & voice selesai

**Proses di runner:**

```
1. Baca storyboard JSON dari API
2. Download semua image dan voice per scene
3. Remotion: compose video dengan camera animation, subtitle, effect
4. FFmpeg: mux audio + video → output MP4
5. Upload MP4 ke storage
6. PATCH /api/render-jobs/:id { status: 'completed', video_url: '...' }
```

---

## Stage 10 — Thumbnail

**Input:** Output director (`thumbnail_bible`), judul video, fakta utama

**Output:** Thumbnail image + overlay text

**API endpoint:** `POST /api/projects/:id/thumbnail`

---

## Stage 11 — SEO

**Input:** Topik, outline, script

**Output:** `title`, `description`, `tags[]`, `hashtags[]`, `chapters[]`

**API endpoint:** `POST /api/projects/:id/seo`

---

## Stage 12 — YouTube Upload

**Input:** `video_url`, `thumbnail_url`, semua SEO metadata

**Output:** `youtube_id`, `youtube_url`

**API endpoint:** `POST /api/projects/:id/upload`

**Fitur:**
- Upload video
- Set thumbnail
- Set judul, deskripsi, tags
- Assign ke playlist
- Jadwalkan publish (opsional)

---

## Regenerate Flow

```
User klik "Regenerate" pada tahap tertentu
    │
    ▼
API: reset status kolom yang bersangkutan → 'idle'
    │
    ▼
Jalankan ulang AI/runner untuk tahap tersebut
    │
    ▼
Update database dengan output baru
    │
    ▼
Frontend polling mendeteksi status → 'completed'
    │
    ▼
Tampilkan hasil baru
```

**Aturan cascade regenerate:**

| Regenerate tahap ini | Harus regenerate ulang downstream |
|---|---|
| Research | Director, Outline, Script, Storyboard, Prompt, Image, Voice, Render |
| Director | Outline, Script, Storyboard, Prompt, Image, Voice, Render |
| Outline | Script, Storyboard, Prompt, Image, Voice, Render |
| Script (1 section) | Storyboard scenes terkait, Prompt, Image, Voice, Render |
| Scene image prompt | Image scene tersebut, Render |
| Scene image | Render |
| Scene voice | Render |
| Thumbnail | — |
| SEO | — |

---

## Error Handling

- Setiap stage menyimpan `status` → `'failed'` dan pesan error jika gagal
- User dapat retry stage yang gagal tanpa mengulang stage sebelumnya
- GitHub Actions job failure → webhook PATCH `/api/render-jobs/:id` dengan `{ status: 'failed', error: '...' }`
- Frontend menampilkan error message dan tombol retry per stage