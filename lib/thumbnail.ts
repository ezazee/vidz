import sharp from 'sharp'
import path from 'path'
import { GlobalFonts, createCanvas } from '@napi-rs/canvas'

// Font dibundel di repo — Vercel/GitHub runner tidak punya font sistem (SVG <text> jadi kotak-kotak)
const FONT_PATH = path.join(process.cwd(), 'assets', 'fonts', 'Anton-Regular.ttf')
if (!GlobalFonts.has('Anton')) {
  try { GlobalFonts.registerFromPath(FONT_PATH, 'Anton') } catch (e) { console.error('Font register failed:', e) }
}

// Template thumbnail "Cabang Sejarah" v2 — split screen dua dunia:
// kiri = sejarah asli (suram, desaturasi), kanan = skenario alternatif (cerah, saturasi naik),
// pembatas merah di tengah, maskot kaget di kanan bawah, judul 2 warna outline hitam.
// Komposisi 100% kode (deterministik) — AI hanya menyuplai background.

const W = 1280
const H = 720
const HALF = W / 2

// Maskot ekspresif — ekspresi berubah sesuai mood topik
export type MascotMood = 'shocked' | 'angry' | 'sad' | 'happy' | 'thinking'

const EXPRESSIONS: Record<MascotMood, { limbs: number[][]; face: string }> = {
  // Kaget: alis naik, mata besar, mulut terbuka, dua tangan ke atas
  shocked: {
    limbs: [[110, 130, 110, 225], [110, 148, 42, 78], [110, 148, 178, 78], [110, 225, 72, 315], [110, 225, 148, 315]],
    face: `
      <path d="M 74 42 Q 86 34 98 40" fill="none" stroke="#111111" stroke-width="7" stroke-linecap="round"/>
      <path d="M 122 40 Q 134 34 146 42" fill="none" stroke="#111111" stroke-width="7" stroke-linecap="round"/>
      <circle cx="88" cy="62" r="11" fill="#111111"/><circle cx="132" cy="62" r="11" fill="#111111"/>
      <circle cx="91" cy="58" r="4" fill="#ffffff"/><circle cx="135" cy="58" r="4" fill="#ffffff"/>
      <ellipse cx="110" cy="100" rx="16" ry="21" fill="#111111"/>
      <ellipse cx="110" cy="107" rx="9" ry="10" fill="#e74c3c"/>`,
  },
  // Marah: alis turun ke tengah, mata sipit, mulut cemberut, tangan mengepal ke bawah
  angry: {
    limbs: [[110, 130, 110, 225], [110, 150, 55, 200], [110, 150, 165, 200], [110, 225, 72, 315], [110, 225, 148, 315]],
    face: `
      <path d="M 72 44 L 100 56" fill="none" stroke="#111111" stroke-width="8" stroke-linecap="round"/>
      <path d="M 148 44 L 120 56" fill="none" stroke="#111111" stroke-width="8" stroke-linecap="round"/>
      <circle cx="88" cy="68" r="9" fill="#111111"/><circle cx="132" cy="68" r="9" fill="#111111"/>
      <path d="M 88 105 Q 110 92 132 105" fill="none" stroke="#111111" stroke-width="8" stroke-linecap="round"/>`,
  },
  // Sedih: alis miring ke luar, mata kecil, mulut melengkung turun + air mata
  sad: {
    limbs: [[110, 130, 110, 225], [110, 150, 62, 215], [110, 150, 158, 215], [110, 225, 78, 315], [110, 225, 142, 315]],
    face: `
      <path d="M 76 48 Q 88 42 98 48" fill="none" stroke="#111111" stroke-width="7" stroke-linecap="round" transform="rotate(14 87 45)"/>
      <path d="M 122 48 Q 132 42 144 48" fill="none" stroke="#111111" stroke-width="7" stroke-linecap="round" transform="rotate(-14 133 45)"/>
      <circle cx="88" cy="66" r="8" fill="#111111"/><circle cx="132" cy="66" r="8" fill="#111111"/>
      <path d="M 90 106 Q 110 94 130 106" fill="none" stroke="#111111" stroke-width="8" stroke-linecap="round"/>
      <path d="M 78 78 Q 74 90 78 98" fill="none" stroke="#5bb8e8" stroke-width="7" stroke-linecap="round"/>`,
  },
  // Senang: mata melengkung senyum, mulut senyum lebar, dua tangan ke atas merayakan
  happy: {
    limbs: [[110, 130, 110, 225], [110, 148, 44, 72], [110, 148, 176, 72], [110, 225, 72, 315], [110, 225, 148, 315]],
    face: `
      <path d="M 78 62 Q 88 52 98 62" fill="none" stroke="#111111" stroke-width="8" stroke-linecap="round"/>
      <path d="M 122 62 Q 132 52 142 62" fill="none" stroke="#111111" stroke-width="8" stroke-linecap="round"/>
      <path d="M 82 92 Q 110 118 138 92" fill="none" stroke="#111111" stroke-width="9" stroke-linecap="round"/>`,
  },
  // Mikir: satu alis naik, mata melirik, mulut datar kecil, tangan ke dagu
  thinking: {
    limbs: [[110, 130, 110, 225], [110, 155, 82, 118], [110, 150, 168, 205], [110, 225, 78, 315], [110, 225, 142, 315]],
    face: `
      <path d="M 74 46 Q 86 40 98 44" fill="none" stroke="#111111" stroke-width="7" stroke-linecap="round"/>
      <path d="M 122 38 Q 134 32 146 38" fill="none" stroke="#111111" stroke-width="7" stroke-linecap="round"/>
      <circle cx="92" cy="64" r="9" fill="#111111"/><circle cx="136" cy="60" r="9" fill="#111111"/>
      <path d="M 96 102 L 126 102" fill="none" stroke="#111111" stroke-width="8" stroke-linecap="round"/>`,
  },
}

// Deteksi mood dari topik — keyword bahasa Indonesia
export function detectMood(title: string): MascotMood {
  const t = title.toLowerCase()
  if (/(perang|hancur|serang|invasi|konflik|lawan|bertempur|kalah)/.test(t)) return 'angry'
  if (/(punah|hilang|mati|runtuh|tenggelam|musnah|gagal|tragedi|bencana)/.test(t)) return 'sad'
  if (/(menang|berhasil|jaya|makmur|maju|kaya|merdeka|bangkit)/.test(t)) return 'happy'
  if (/(misteri|rahasia|aneh|kenapa|mengapa|bagaimana cara|siapa)/.test(t)) return 'thinking'
  return 'shocked'
}

function mascotSvg(mood: MascotMood): Buffer {
  const { limbs, face } = EXPRESSIONS[mood]
  const halo = limbs.map(([a, b, c, d]) =>
    `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#ffffff" stroke-width="26" stroke-linecap="round"/>`).join('')
  const ink = limbs.map(([a, b, c, d]) =>
    `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#111111" stroke-width="11" stroke-linecap="round"/>`).join('')
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 335">
    ${halo}${ink}
    <circle cx="110" cy="70" r="62" fill="#ffffff" stroke="#ffffff" stroke-width="18"/>
    <circle cx="110" cy="70" r="62" fill="#ffffff" stroke="#111111" stroke-width="10"/>
    ${face}
  </svg>`)
}

// Bersihkan judul: buang [THEME:...], kutip, "Bagaimana Jika" → "JIKA" biar pendek & punchy.
// Judul panjang dengan subtitle ("X: Y") dipotong di titik dua — subtitle bikin 3+ baris raksasa
// yang menutupi karakter di thumbnail (ditemukan lewat review manual hasil render).
export function cleanThumbnailTitle(raw: string): string {
  let t = raw.replace(/\s*\[THEME:.*?\]\s*/gi, '').replace(/^["']|["']$/g, '').trim()
  t = t.replace(/^bagaimana jika/i, 'JIKA')

  const colonIdx = t.indexOf(':')
  if (colonIdx > 10 && colonIdx < t.length - 5) {
    t = t.slice(0, colonIdx)
  }
  if (t.length > 60) {
    t = t.slice(0, 57).replace(/\s+\S*$/, '') + '…'
  }

  return t.toUpperCase()
}

function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) {
      lines.push(cur)
      cur = w
    } else {
      cur = (cur + ' ' + w).trim()
    }
  }
  if (cur) lines.push(cur)
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = kept[maxLines - 1].replace(/\s+\S*$/, '') + '…'
    return kept
  }
  return lines
}

// #7 Rotasi komposisi thumbnail — biar tidak selalu split-vertikal + stickman kanan-bawah.
// 'flat_minimal': background warna solid + stickman besar + judul tebal — 100% tanpa AI image,
// jadi nol risiko simbol/teks ngaco (referensi: channel edukasi bergaya stickman flat).
export type ThumbLayout = 'split_vertical' | 'split_diagonal' | 'full_overlay' | 'split_horizontal' | 'flat_minimal'
export type StickmanPos = 'bottom_right' | 'bottom_left' | 'bottom_center_small' | 'center_large' | 'none'
export type TextTreatmentName =
  | 'yellow_top' | 'white_red_center' | 'white_blue_bottom' | 'yellow_bottom'
  | 'white_top' | 'cyan_top'

const TEXT_TREATMENTS: Record<TextTreatmentName, { colors: [string, string]; position: 'top' | 'center' | 'bottom' }> = {
  yellow_top: { colors: ['#ffd23f', '#ffffff'], position: 'top' },
  white_red_center: { colors: ['#ffffff', '#ff4d4d'], position: 'center' },
  white_blue_bottom: { colors: ['#ffffff', '#7ec8ff'], position: 'bottom' },
  yellow_bottom: { colors: ['#ffd23f', '#ffffff'], position: 'bottom' },
  // Varian 'top' tambahan — dipakai layout 'flat_minimal' (mascot besar di bawah, teks harus di atas).
  white_top: { colors: ['#ffffff', '#ffd23f'], position: 'top' },
  cyan_top: { colors: ['#7ec8ff', '#ffffff'], position: 'top' },
}

// Treatment yang aman dipakai di layout 'flat_minimal' (posisi 'top' saja — mascot menutupi center/bottom).
export const TOP_TEXT_TREATMENTS: TextTreatmentName[] = ['yellow_top', 'white_top', 'cyan_top']

export interface ThumbnailInput {
  bgLeft: Buffer          // sejarah asli (akan dibuat suram). Diabaikan kalau layout 'flat_minimal'.
  bgRight?: Buffer        // skenario alternatif (cerah). Kalau kosong: pakai bgLeft
  title: string
  mood?: MascotMood       // ekspresi maskot; default: deteksi otomatis dari judul
  layout?: ThumbLayout
  stickman?: StickmanPos
  textTreatment?: TextTreatmentName
  bgColor?: string        // warna dasar untuk layout 'flat_minimal', mis. "#2d3a8c" — scene 100% kode (lihat flatSceneSvg)
}

// Render judul via canvas + font bundelan (bukan SVG <text> yang butuh font sistem)
function renderTitlePng(lines: string[], treatment: TextTreatmentName, maxFontSize = 104): Buffer {
  const spec = TEXT_TREATMENTS[treatment] ?? TEXT_TREATMENTS.yellow_top
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  // Cari fontSize yang muat: ukur beneran pakai measureText
  let fontSize = maxFontSize
  const maxWidth = W * 0.9
  while (fontSize > 42) {
    ctx.font = `${fontSize}px Anton`
    const widest = Math.max(...lines.map(l => ctx.measureText(l).width))
    if (widest <= maxWidth) break
    fontSize -= 4
  }

  const lineHeight = fontSize * 1.16
  const blockH = lines.length * lineHeight
  let startY: number
  if (spec.position === 'top') startY = 36
  else if (spec.position === 'center') startY = (H - blockH) / 2
  else startY = H - blockH - 40

  ctx.font = `${fontSize}px Anton`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(8, Math.round(fontSize * 0.18))
  ctx.strokeStyle = '#000000'

  lines.forEach((line, i) => {
    const y = startY + i * lineHeight
    ctx.strokeText(line, W / 2, y)
    ctx.fillStyle = i % 2 === 0 ? spec.colors[0] : spec.colors[1]
    ctx.fillText(line, W / 2, y)
  })

  return canvas.toBuffer('image/png')
}

// Scene flat-vector 100% kode (bukan AI) — dipakai layout 'flat_minimal'. 4 varian dirotasi acak,
// tiap varian cuma bentuk-bentuk geometris dasar (langit + tanah + 1-2 objek), tanpa teks sama sekali.
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, ((n >> 16) & 0xff) + amount))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amount))
  const b = Math.min(255, Math.max(0, (n & 0xff) + amount))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function flatSceneSvg(baseColor: string): Buffer {
  const sky = shade(baseColor, 60)
  const ground = shade(baseColor, -20)
  const accent = shade(baseColor, 100)
  const variants = [
    // Bukit + matahari
    `<circle cx="${W - 220}" cy="180" r="90" fill="${accent}"/>
     <path d="M 0 ${H * 0.62} Q ${W * 0.3} ${H * 0.5} ${W * 0.6} ${H * 0.62} T ${W} ${H * 0.58} V ${H} H 0 Z" fill="${ground}"/>`,
    // Rumah sederhana + jalan
    `<path d="M 0 ${H * 0.7} Q ${W * 0.5} ${H * 0.62} ${W} ${H * 0.7} V ${H} H 0 Z" fill="${ground}"/>
     <rect x="${W - 420}" y="${H * 0.42}" width="240" height="200" fill="${accent}"/>
     <polygon points="${W - 440},${H * 0.42} ${W - 300},${H * 0.28} ${W - 160},${H * 0.42}" fill="${accent}"/>`,
    // Pohon + tanah
    `<path d="M 0 ${H * 0.66} Q ${W * 0.5} ${H * 0.56} ${W} ${H * 0.66} V ${H} H 0 Z" fill="${ground}"/>
     <rect x="${W * 0.14}" y="${H * 0.5}" width="18" height="120" fill="${shade(baseColor, -60)}"/>
     <circle cx="${W * 0.15}" cy="${H * 0.44}" r="90" fill="${accent}"/>`,
    // Gedung silhouette
    `<path d="M 0 ${H * 0.72} H ${W} V ${H} H 0 Z" fill="${ground}"/>
     <rect x="${W - 340}" y="${H * 0.38}" width="90" height="${H * 0.34}" fill="${accent}"/>
     <rect x="${W - 220}" y="${H * 0.48}" width="90" height="${H * 0.24}" fill="${accent}"/>
     <rect x="${W - 460}" y="${H * 0.44}" width="90" height="${H * 0.28}" fill="${accent}"/>`,
  ]
  const scene = variants[Math.floor(Math.random() * variants.length)]
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${sky}"/>
    ${scene}
  </svg>`)
}

// Bikin background sesuai layout — kembalikan array composite layer (bg + divider).
async function buildBackground(layout: ThumbLayout, bgLeft: Buffer, bgRightRaw?: Buffer, bgColor?: string) {
  const dim = { saturation: 0.45, brightness: 0.78 }
  const vivid = { saturation: 1.2, brightness: 1.05 }
  const bgRight = bgRightRaw ?? bgLeft
  const layers: sharp.OverlayOptions[] = []

  if (layout === 'flat_minimal') {
    // Scene 100% kode (SVG deterministik) — AI-generated background (FLUX) terbukti berulang kali
    // menghalusinasi teks palsu/ngaco meski prompt eksplisit melarangnya (diverifikasi 4x uji lokal
    // berturut-turut gagal). Zero AI di layout ini = zero risiko teks/simbol ngaco selamanya.
    const color = bgColor ?? '#2d3a8c'
    const svg = flatSceneSvg(color)
    layers.push({ input: svg, left: 0, top: 0 })
    return layers
  }

  if (layout === 'full_overlay') {
    // Satu gambar penuh + gradient gelap di bawah biar teks kebaca
    const full = await sharp(bgRight).resize(W, H, { fit: 'cover', position: 'attention' }).modulate(vivid).toBuffer()
    const grad = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.35" stop-color="#000000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000000" stop-opacity="0.72"/>
      </linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`)
    layers.push({ input: full, left: 0, top: 0 }, { input: grad, left: 0, top: 0 })
    return layers
  }

  if (layout === 'split_horizontal') {
    const top = await sharp(bgLeft).resize(W, H / 2, { fit: 'cover', position: 'attention' }).modulate(dim).toBuffer()
    const bottom = await sharp(bgRight).resize(W, H / 2, { fit: 'cover', position: 'attention' }).modulate(vivid).toBuffer()
    const divider = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <rect x="0" y="${H / 2 - 7}" width="${W}" height="14" fill="#e01e1e" stroke="#7a0000" stroke-width="3"/></svg>`)
    layers.push({ input: top, left: 0, top: 0 }, { input: bottom, left: 0, top: H / 2 }, { input: divider, left: 0, top: 0 })
    return layers
  }

  if (layout === 'split_diagonal') {
    // Kanan vivid penuh, kiri suram di-mask jadi segitiga diagonal
    const rightFull = await sharp(bgRight).resize(W, H, { fit: 'cover', position: 'attention' }).modulate(vivid).toBuffer()
    const leftFull = await sharp(bgLeft).resize(W, H, { fit: 'cover', position: 'attention' }).modulate(dim).toBuffer()
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <polygon points="0,0 ${HALF + 120},0 ${HALF - 120},${H} 0,${H}" fill="#ffffff"/></svg>`)
    const leftMasked = await sharp(leftFull)
      .composite([{ input: mask, blend: 'dest-in' }])
      .png().toBuffer()
    const divider = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <polygon points="${HALF + 108},0 ${HALF + 132},0 ${HALF - 108},${H} ${HALF - 132},${H}" fill="#e01e1e" stroke="#7a0000" stroke-width="3"/></svg>`)
    layers.push({ input: rightFull, left: 0, top: 0 }, { input: leftMasked, left: 0, top: 0 }, { input: divider, left: 0, top: 0 })
    return layers
  }

  // default: split_vertical
  const left = await sharp(bgLeft).resize(HALF, H, { fit: 'cover', position: 'attention' }).modulate(dim).toBuffer()
  const right = await sharp(bgRight).resize(HALF, H, { fit: 'cover', position: 'attention' }).modulate(vivid).toBuffer()
  const divider = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <polygon points="${HALF - 16},0 ${HALF + 4},0 ${HALF + 16},${H} ${HALF - 4},${H}" fill="#e01e1e" stroke="#7a0000" stroke-width="3"/></svg>`)
  layers.push({ input: left, left: 0, top: 0 }, { input: right, left: HALF, top: 0 }, { input: divider, left: 0, top: 0 })
  return layers
}

// Posisi & ukuran stickman sesuai pool rotasi. null = tanpa stickman.
async function buildMascotLayer(pos: StickmanPos, mood: MascotMood): Promise<sharp.OverlayOptions | null> {
  if (pos === 'none') return null
  if (pos === 'center_large') {
    // Stickman di tengah-bawah — dipakai layout 'flat_minimal'. Skala dijaga cukup kecil supaya
    // kepala mascot tidak ketiban judul (ditemukan lewat review manual: 0.82 kena tabrak).
    const mascotH = Math.round(H * 0.58)
    const mascotW = Math.round(mascotH * (220 / 335))
    const mascot = await sharp(mascotSvg(mood)).resize(mascotW, mascotH).png().toBuffer()
    return { input: mascot, left: Math.round((W - mascotW) / 2), top: H - mascotH }
  }
  const scale = pos === 'bottom_center_small' ? 0.4 : 0.56
  const mascotH = Math.round(H * scale)
  const mascotW = Math.round(mascotH * (220 / 335))
  const mascot = await sharp(mascotSvg(mood)).resize(mascotW, mascotH).png().toBuffer()
  let left: number
  if (pos === 'bottom_left') left = 36
  else if (pos === 'bottom_center_small') left = Math.round((W - mascotW) / 2)
  else left = W - mascotW - 36
  return { input: mascot, left, top: H - mascotH - 16 }
}

export async function composeThumbnail(input: ThumbnailInput): Promise<Buffer> {
  const title = cleanThumbnailTitle(input.title)
  // maxChars 26 (bukan 18) — cegah judul sedang (mis. "CHECKING YOUR PHONE") kepecah jadi
  // 3 baris lalu kepotong paksa; font auto-shrink lewat measureText sudah handle lebar baris.
  const lines = wrapLines(title, 26, 2)
  const layout = input.layout ?? 'split_vertical'
  const stickman = input.stickman ?? 'bottom_right'
  const textTreatment = input.textTreatment ?? 'yellow_top'

  const bgLayers = await buildBackground(layout, input.bgLeft, input.bgRight, input.bgColor)
  // flat_minimal: mascot menempati ~58% tinggi frame dari bawah, judul dipaksa kecil supaya
  // selalu muat di ruang atas tanpa nabrak kepala mascot.
  const textPng = renderTitlePng(lines, textTreatment, layout === 'flat_minimal' ? 62 : 104)
  const mascotLayer = await buildMascotLayer(stickman, input.mood ?? detectMood(input.title))

  const layers: sharp.OverlayOptions[] = [...bgLayers]
  if (mascotLayer) layers.push(mascotLayer)
  layers.push({ input: textPng, left: 0, top: 0 })

  return sharp({ create: { width: W, height: H, channels: 3, background: '#000000' } })
    .composite(layers)
    .jpeg({ quality: 90 })
    .toBuffer()
}

export const THUMBNAIL_BG_STYLE =
  'vibrant colorful hand-drawn cartoon illustration, webcomic style, thick black ink outlines, ' +
  'rich saturated colors, flat cel shading, dramatic epic composition, high contrast lighting, ' +
  'children storybook art'

// FLUX kadang menyelipkan swastika/simbol kebencian sebagai "generic wall poster/insignia/flag"
// filler di background, bahkan di scene yang tidak berkaitan sejarah/perang sama sekali —
// diverifikasi lewat uji lokal. Negative prompt diperkuat + eksplisit larang elemen sumbernya.
export const SAFETY_NEGATIVE_PROMPT =
  'no text, no watermark, no logo, no signature, no gibberish text, no photorealism, ' +
  'no swastika, no nazi symbols, no hate symbols, no political symbols, no national flags, ' +
  'no religious symbols, no propaganda imagery, no offensive symbols, ' +
  'no wall posters with symbols or insignia, no framed wall art with symbols, no banners with emblems'
