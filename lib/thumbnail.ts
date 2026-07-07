import sharp from 'sharp'

// Template thumbnail "Cabang Sejarah" v2 — split screen dua dunia:
// kiri = sejarah asli (suram, desaturasi), kanan = skenario alternatif (cerah, saturasi naik),
// pembatas merah di tengah, maskot kaget di kanan bawah, judul 2 warna outline hitam.
// Komposisi 100% kode (deterministik) — AI hanya menyuplai background.

const W = 1280
const H = 720
const HALF = W / 2

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Maskot pose kaget — versi thumbnail: kepala besar, alis naik, mulut terbuka (ekspresif)
function mascotSvg(): Buffer {
  const limbs = [
    [110, 130, 110, 225], // badan
    [110, 148, 42, 78],   // lengan kiri ke atas
    [110, 148, 178, 78],  // lengan kanan ke atas
    [110, 225, 72, 315],  // kaki kiri
    [110, 225, 148, 315], // kaki kanan
  ]
  const halo = limbs.map(([a, b, c, d]) =>
    `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#ffffff" stroke-width="26" stroke-linecap="round"/>`).join('')
  const ink = limbs.map(([a, b, c, d]) =>
    `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#111111" stroke-width="11" stroke-linecap="round"/>`).join('')
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 335">
    ${halo}${ink}
    <circle cx="110" cy="70" r="62" fill="#ffffff" stroke="#ffffff" stroke-width="18"/>
    <circle cx="110" cy="70" r="62" fill="#ffffff" stroke="#111111" stroke-width="10"/>
    <!-- alis naik (kaget) -->
    <path d="M 74 42 Q 86 34 98 40" fill="none" stroke="#111111" stroke-width="7" stroke-linecap="round"/>
    <path d="M 122 40 Q 134 34 146 42" fill="none" stroke="#111111" stroke-width="7" stroke-linecap="round"/>
    <!-- mata besar -->
    <circle cx="88" cy="62" r="11" fill="#111111"/>
    <circle cx="132" cy="62" r="11" fill="#111111"/>
    <circle cx="91" cy="58" r="4" fill="#ffffff"/>
    <circle cx="135" cy="58" r="4" fill="#ffffff"/>
    <!-- mulut terbuka kaget -->
    <ellipse cx="110" cy="100" rx="16" ry="21" fill="#111111"/>
    <ellipse cx="110" cy="107" rx="9" ry="10" fill="#e74c3c"/>
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

export interface ThumbnailInput {
  bgLeft: Buffer          // sejarah asli (akan dibuat suram)
  bgRight?: Buffer        // skenario alternatif (cerah). Kalau kosong: pakai bgLeft
  title: string
}

export async function composeThumbnail(input: ThumbnailInput): Promise<Buffer> {
  const title = cleanThumbnailTitle(input.title)
  const lines = wrapLines(title, 18, 3)
  const longest = Math.max(...lines.map(l => l.length))
  const fontSize = Math.max(48, Math.min(100, Math.floor((W * 0.88) / (longest * 0.68))))
  const lineHeight = fontSize * 1.14

  // Kiri: suram (desaturasi + gelap). Kanan: vivid (saturasi naik)
  const left = await sharp(input.bgLeft)
    .resize(HALF, H, { fit: 'cover', position: 'attention' })
    .modulate({ saturation: 0.45, brightness: 0.78 })
    .toBuffer()
  const right = await sharp(input.bgRight ?? input.bgLeft)
    .resize(HALF, H, { fit: 'cover', position: 'attention' })
    .modulate({ saturation: 1.2, brightness: 1.05 })
    .toBuffer()

  // Pembatas merah miring dikit biar dinamis
  const divider = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <polygon points="${HALF - 16},0 ${HALF + 4},0 ${HALF + 16},${H} ${HALF - 4},${H}" fill="#e01e1e" stroke="#7a0000" stroke-width="3"/>
  </svg>`)

  // Judul: baris ganjil kuning, genap putih (kayak referensi)
  const textSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${lines.map((line, i) => `
      <text x="${W / 2}" y="${40 + fontSize + i * lineHeight}"
        font-family="Impact, 'Arial Black', 'DejaVu Sans', sans-serif" font-weight="900"
        font-size="${fontSize}" text-anchor="middle"
        fill="${i % 2 === 0 ? '#ffd23f' : '#ffffff'}" stroke="#000000" stroke-width="${Math.round(fontSize * 0.16)}"
        paint-order="stroke" stroke-linejoin="round">${escapeXml(line)}</text>`).join('')}
  </svg>`)

  const mascotH = Math.round(H * 0.56)
  const mascotW = Math.round(mascotH * (220 / 335))
  const mascot = await sharp(mascotSvg()).resize(mascotW, mascotH).png().toBuffer()

  return sharp({ create: { width: W, height: H, channels: 3, background: '#000000' } })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: HALF, top: 0 },
      { input: divider, left: 0, top: 0 },
      { input: mascot, left: W - mascotW - 36, top: H - mascotH - 16 },
      { input: textSvg, left: 0, top: 0 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer()
}

export const THUMBNAIL_BG_STYLE =
  'vibrant colorful hand-drawn cartoon illustration, webcomic style, thick black ink outlines, ' +
  'rich saturated colors, flat cel shading, dramatic epic composition, high contrast lighting, ' +
  'children storybook art'
