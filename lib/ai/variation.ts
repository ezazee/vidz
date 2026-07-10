// Pool variasi anti-templated-pattern — dipakai lintas pipeline (script, storyboard,
// thumbnail) supaya antar-video tidak identik. Semua pilihan disimpan ke DB per video
// untuk rotasi (exclude yang baru dipakai) & bahan memory/similarity system nanti.

export const CATEGORIES = [
  'What-If Sejarah Nusantara',
  'What-If Sejarah Dunia',
  'What-If Tokoh Terkenal',
  'What-If Sains & Teknologi',
  'What-If Perang & Konflik',
  'What-If Bencana Alam',
] as const

// Palette & mood per kategori — hint ditempel ke prompt gambar/thumbnail (#5).
export const CATEGORY_PALETTE: Record<string, string> = {
  'What-If Sejarah Nusantara': 'warm sepia and gold tones, tropical earthy palette, batik-inspired accents',
  'What-If Sejarah Dunia': 'classic warm amber and parchment tones, vintage muted palette',
  'What-If Tokoh Terkenal': 'dramatic high-contrast portrait lighting, bold red and cream accents',
  'What-If Sains & Teknologi': 'cool blue and teal neon tones, clean futuristic palette',
  'What-If Perang & Konflik': 'desaturated steel grey and ember orange, smoky dramatic palette',
  'What-If Bencana Alam': 'dark stormy purple and ash grey, ominous cinematic palette',
}

export function parseCategory(topic: string): string | null {
  const m = topic.match(/\[THEME:\s*(.*?)\]/i)
  if (!m) return null
  const t = m[1].trim()
  return CATEGORIES.find(c => c.toLowerCase() === t.toLowerCase()) ?? t
}

export function paletteFor(category: string | null): string {
  if (!category) return ''
  return CATEGORY_PALETTE[category] ?? ''
}

// --- #2 Opening style ---------------------------------------------------------
// Setiap gaya = instruksi eksplisit yang DIPAKSA ke prompt (bukan biar AI pilih bebas),
// supaya `opening_style_used` yang disimpan benar-benar mencerminkan hasil.
export const OPENING_STYLES: { id: string; instruction: string }[] = [
  { id: 'pertanyaan_retoris', instruction: 'Buka dengan pertanyaan retoris yang menohok langsung ke penonton.' },
  { id: 'statement_kontroversial', instruction: 'Buka dengan pernyataan berani/kontroversial yang memancing perdebatan.' },
  { id: 'fakta_historis', instruction: 'Buka dengan satu fakta sejarah singkat yang mengejutkan (dengan angka/tahun konkret).' },
  { id: 'hipotesis_langsung', instruction: 'Buka langsung dengan hipotesis "Bayangkan jika..." tanpa basa-basi.' },
  { id: 'adegan_sinematik', instruction: 'Buka dengan deskripsi adegan sinematik yang menempatkan penonton di tengah momen krusial.' },
  { id: 'kontras_waktu', instruction: 'Buka dengan mengontraskan dunia nyata sekarang vs dunia alternatif yang akan dibahas.' },
  { id: 'tokoh_pov', instruction: 'Buka dari sudut pandang tokoh sejarah kunci di detik-detik penentu.' },
  { id: 'angka_mengejutkan', instruction: 'Buka dengan statistik atau angka mengejutkan yang relevan dengan topik.' },
  { id: 'teka_teki', instruction: 'Buka dengan teka-teki/misteri "apa yang sebenarnya terjadi seandainya..." yang menggantung.' },
  { id: 'analogi_relatable', instruction: 'Buka dengan analogi sederhana yang relatable dari kehidupan sehari-hari penonton.' },
]

// --- #4 Visual effect sequence ------------------------------------------------
export const CAMERA_POOL = [
  'zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down', 'static',
] as const

// Urutan efek acak, tanpa efek sama di 2 scene berturut-turut.
export function buildCameraSequence(n: number): string[] {
  const seq: string[] = []
  for (let i = 0; i < n; i++) {
    let pick: string
    do {
      pick = CAMERA_POOL[Math.floor(Math.random() * CAMERA_POOL.length)]
    } while (pick === seq[i - 1])
    seq.push(pick)
  }
  return seq
}

// --- #7 Thumbnail rotation ----------------------------------------------------
export const THUMBNAIL_LAYOUTS = ['split_vertical', 'split_diagonal', 'full_overlay', 'split_horizontal'] as const
// bottom_center_small sengaja tak dirotasi: tabrakan sama teks center/bottom (ketutupan).
export const STICKMAN_POSITIONS = ['bottom_right', 'bottom_left', 'none'] as const
export const TEXT_TREATMENTS = ['yellow_top', 'white_red_center', 'white_blue_bottom', 'yellow_bottom'] as const

export type ThumbnailLayout = typeof THUMBNAIL_LAYOUTS[number]
export type StickmanPosition = typeof STICKMAN_POSITIONS[number]
export type TextTreatment = typeof TEXT_TREATMENTS[number]

// Pilih acak dari pool, hindari nilai yang ada di `recent` (mis. 3 terakhir).
// Kalau semua ke-exclude, fallback ke seluruh pool.
export function pickExcluding<T>(pool: readonly T[], recent: (T | null | undefined)[]): T {
  const banned = new Set(recent.filter(Boolean) as T[])
  const avail = pool.filter(p => !banned.has(p))
  const from = avail.length > 0 ? avail : pool
  return from[Math.floor(Math.random() * from.length)]
}
