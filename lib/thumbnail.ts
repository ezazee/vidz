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

// Bersihkan judul: buang [THEME:...], kutip, "Bagaimana Jika" → "JIKA" biar pendek & punchy
export function cleanThumbnailTitle(raw: string): string {
  let t = raw.replace(/\s*\[THEME:.*?\]\s*/gi, '').replace(/^["']|["']$/g, '').trim()
  t = t.replace(/^bagaimana jika/i, 'JIKA')
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
export type ThumbLayout = 'split_vertical' | 'split_diagonal' | 'full_overlay' | 'split_horizontal'
export type StickmanPos = 'bottom_right' | 'bottom_left' | 'bottom_center_small' | 'none'
export type TextTreatmentName = 'yellow_top' | 'white_red_center' | 'white_blue_bottom' | 'yellow_bottom'

const TEXT_TREATMENTS: Record<TextTreatmentName, { colors: [string, string]; position: 'top' | 'center' | 'bottom' }> = {
  yellow_top: { colors: ['#ffd23f', '#ffffff'], position: 'top' },
  white_red_center: { colors: ['#ffffff', '#ff4d4d'], position: 'center' },
  white_blue_bottom: { colors: ['#ffffff', '#7ec8ff'], position: 'bottom' },
  yellow_bottom: { colors: ['#ffd23f', '#ffffff'], position: 'bottom' },
}

export interface ThumbnailInput {
  bgLeft: Buffer          // sejarah asli (akan dibuat suram)
  bgRight?: Buffer        // skenario alternatif (cerah). Kalau kosong: pakai bgLeft
  title: string
  mood?: MascotMood       // ekspresi maskot; default: deteksi otomatis dari judul
  layout?: ThumbLayout
  stickman?: StickmanPos
  textTreatment?: TextTreatmentName
}

// Render judul via canvas + font bundelan (bukan SVG <text> yang butuh font sistem)
function renderTitlePng(lines: string[], treatment: TextTreatmentName): Buffer {
  const spec = TEXT_TREATMENTS[treatment] ?? TEXT_TREATMENTS.yellow_top
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  // Cari fontSize yang muat: ukur beneran pakai measureText
  let fontSize = 104
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

// Bikin background sesuai layout — kembalikan array composite layer (bg + divider).
async function buildBackground(layout: ThumbLayout, bgLeft: Buffer, bgRightRaw?: Buffer) {
  const dim = { saturation: 0.45, brightness: 0.78 }
  const vivid = { saturation: 1.2, brightness: 1.05 }
  const bgRight = bgRightRaw ?? bgLeft
  const layers: sharp.OverlayOptions[] = []

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
  const lines = wrapLines(title, 18, 3)
  const layout = input.layout ?? 'split_vertical'
  const stickman = input.stickman ?? 'bottom_right'
  const textTreatment = input.textTreatment ?? 'yellow_top'

  const bgLayers = await buildBackground(layout, input.bgLeft, input.bgRight)
  const textPng = renderTitlePng(lines, textTreatment)
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
