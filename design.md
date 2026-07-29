# Design — StoryZ

Sistem desain terkunci untuk aplikasi ini. Setiap redesign halaman membaca file
ini sebelum menulis kode. Jangan bikin sistem baru per halaman — perluas atau
ubah file ini kalau sistemnya memang perlu tumbuh.

## Genre

`atmospheric` — dark canvas, satu aksen hangat, tipografi grotesk yang tegas.
Dipilih karena produknya alat AI kreatif yang dipakai berjam-jam; kanvas gelap
mengurangi kelelahan mata dan menyatu dengan identitas landing page.

## Macrostructure family

- **Marketing pages** (`/`): Marquee Hero. Boleh pakai enrichment (3D, scroll story).
- **App pages** (`/dashboard`, `/render-queue`, `/planner`, `/channels`,
  `/schedule`, `/studio`, `/library`, `/integrations`): **Workbench** — shell
  sidebar tetap + topbar + area konten. Yang boleh beda antar halaman cuma
  komposisi isi kontennya, bukan shell-nya.
- **Detail pages** (`/projects/[id]`): Workbench + panel detail.

## Theme

Dark paper, satu aksen amber. Nilai lengkap ada di `tokens.css`.

- `--color-paper` oklch(15% 0.035 285) — dasar aplikasi
- `--color-paper-2` oklch(19% 0.038 285) — kartu, panel
- `--color-paper-3` oklch(24% 0.042 285) — elemen di atas kartu
- `--color-ink` oklch(97% 0.006 280) — teks utama
- `--color-ink-2` oklch(78% 0.018 280) — teks sekunder
- `--color-ink-3` oklch(62% 0.02 280) — teks tersier, label
- `--color-rule` oklch(30% 0.03 285) — garis pemisah
- `--color-accent` oklch(78% 0.148 66) — aksen tunggal (amber)
- `--color-focus` oklch(80% 0.14 66) — focus ring

**Warna status** (khusus aplikasi, bukan aksen brand):
`--color-ok` hijau · `--color-warn` kuning · `--color-danger` merah.
Dipakai HANYA untuk status data (render sukses/gagal, koneksi putus), tidak
pernah sebagai dekorasi.

**Warna platform** dipakai apa adanya untuk identitas eksternal saja:
YouTube merah, Facebook biru. Tidak pernah untuk elemen UI lain.

## Typography

- Display: Geist 600, tracking -0.03em
- Body: Geist 400
- Outlier: JetBrains Mono — maksimal 2 slot per halaman (wordmark + angka/ID)

Skala rasio 1.25 dari 16px. Judul halaman `--text-2xl`, judul kartu
`--text-base` 500, body `--text-sm`.

## Spacing

Skala 4pt bernama (`--space-3xs` … `--space-3xl`). Halaman wajib pakai token,
tidak pernah nilai mentah.

## Motion

- Easing: `--ease-out` cubic-bezier(0.16, 1, 0.3, 1)
- Durasi: `--dur-micro` 120ms · `--dur-short` 220ms · `--dur-long` 420ms
- Pola reveal aplikasi: **tidak ada**. Halaman aplikasi langsung tampil —
  animasi masuk cuma bikin lambat saat dipakai berulang kali. Enrichment
  scroll-story hanya untuk halaman marketing.
- Reduced-motion: semua transisi turun ke ≤150ms.

## Microinteractions

- Sukses senyap. Toast hanya untuk kegagalan dan aksi yang efeknya tak terlihat.
- Hover: satu sinyal per elemen (warna ATAU pergeseran, jangan dua-duanya).
- Focus ring tampil seketika, tidak pernah dianimasikan.

## CTA voice

- Primer: fill amber, pill, label kata kerja pendek ("Jalankan", "Render ulang")
- Sekunder: outline hairline, teks `--color-ink-2`
- Destruktif: outline merah, butuh konfirmasi

## Kejujuran data (aturan keras)

Halaman aplikasi **tidak boleh menampilkan angka karangan**. Kalau data belum
ada atau gagal dimuat: tampilkan `—` plus state kosong yang jujur, jangan
fallback ke angka contoh. Aturan ini lahir dari audit `/dashboard` lama yang
menampilkan `?? 51` posts / `?? 814` likes / `?? 150.51%` engagement seolah data
asli, plus chart tren yang datanya hardcode.

## Yang WAJIB sama di semua halaman

- Shell: sidebar + topbar (`components/Sidebar.tsx`, `.ap__topbar`)
- Wordmark dan logo
- Palet dan aksen (aksen ≤5% area per viewport)
- Font display + body
- Bentuk tombol dan radius
- Empty state dan loading state

## Yang BOLEH beda antar halaman

- Komposisi isi konten (tabel, grid kartu, daftar, panel)
- Kepadatan informasi
- Ada/tidaknya filter dan toolbar

## Peta menu

| # | Menu | Route | Isi |
|---|---|---|---|
| 1 | Overview | `/dashboard` | Ringkasan performa 3 channel |
| 2 | Studio | `/studio` | Produksi manual satu video |
| 3 | Library | `/library` | Semua project + status |
| 4 | Render Queue | `/render-queue` | Antrean & riwayat render job |
| 5 | Content Planner | `/planner` | Rencana topik mingguan per channel |
| 6 | Channels | `/channels` | Identitas & konfigurasi 3 channel |
| 7 | Integrations | `/integrations` | YouTube, Facebook, Telegram |
| 8 | Automation | `/schedule` | Status jadwal n8n (3 workflow) |

`/analytics` dihapus — duplikat `/dashboard` yang tidak dirujuk dari mana pun.
