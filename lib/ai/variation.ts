// Pool variasi anti-templated-pattern — dipakai lintas pipeline (script, storyboard,
// thumbnail) supaya antar-video tidak identik. Semua pilihan disimpan ke DB per video
// untuk rotasi (exclude yang baru dipakai) & bahan memory/similarity system nanti.
//
// Kategori & opening style sekarang per-channel (lihat lib/channels.ts) — fungsi di sini
// generik, menerima daftar dari channel manapun, bukan hardcode 1 channel.

export function parseCategory(topic: string, categories: readonly string[]): string | null {
  const m = topic.match(/\[THEME:\s*(.*?)\]/i)
  if (!m) return null
  const t = m[1].trim()
  return categories.find(c => c.toLowerCase() === t.toLowerCase()) ?? t
}

export function paletteFor(category: string | null, palette: Record<string, string>): string {
  if (!category) return ''
  return palette[category] ?? ''
}

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
