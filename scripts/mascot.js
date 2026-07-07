const sharp = require('sharp')

// Maskot narator "Si Cabang" — stick figure SVG polos yang di-composite ke pojok tiap scene.
// Berperan sebagai narator/pemandu yang menyaksikan cerita (karakter berkostum di dalam
// scene digambar AI). Ekspresi wajah mengikuti emotion scene dari AI penulis naskah.
// Setiap garis digambar 2x: putih tebal di bawah (halo) + hitam di atas, biar kebaca di background ramai.

function limbs(pairs) {
  const halo = pairs.map(([x1, y1, x2, y2]) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffffff" stroke-width="22" stroke-linecap="round"/>`
  ).join('')
  const ink = pairs.map(([x1, y1, x2, y2]) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111111" stroke-width="9" stroke-linecap="round"/>`
  ).join('')
  return halo + ink
}

// Kepala di cx=110 cy=52 r=46 — wajah per ekspresi
const FACES = {
  // Marah: alis turun ke tengah, cemberut
  angry: `
    <path d="M 82 32 L 104 42" fill="none" stroke="#111111" stroke-width="6" stroke-linecap="round"/>
    <path d="M 138 32 L 116 42" fill="none" stroke="#111111" stroke-width="6" stroke-linecap="round"/>
    <circle cx="96" cy="52" r="7" fill="#111111"/><circle cx="124" cy="52" r="7" fill="#111111"/>
    <path d="M 94 78 Q 110 66 126 78" fill="none" stroke="#111111" stroke-width="6" stroke-linecap="round"/>`,
  // Sedih: alis miring keluar, mulut turun, air mata
  sad: `
    <path d="M 86 36 Q 94 31 102 35" fill="none" stroke="#111111" stroke-width="5" stroke-linecap="round" transform="rotate(12 94 33)"/>
    <path d="M 118 35 Q 126 31 134 36" fill="none" stroke="#111111" stroke-width="5" stroke-linecap="round" transform="rotate(-12 126 33)"/>
    <circle cx="96" cy="50" r="6" fill="#111111"/><circle cx="124" cy="50" r="6" fill="#111111"/>
    <path d="M 96 80 Q 110 70 124 80" fill="none" stroke="#111111" stroke-width="6" stroke-linecap="round"/>
    <path d="M 88 58 Q 85 66 88 72" fill="none" stroke="#5bb8e8" stroke-width="5" stroke-linecap="round"/>`,
  // Senang: mata melengkung, senyum lebar
  happy: `
    <path d="M 88 48 Q 96 40 104 48" fill="none" stroke="#111111" stroke-width="6" stroke-linecap="round"/>
    <path d="M 116 48 Q 124 40 132 48" fill="none" stroke="#111111" stroke-width="6" stroke-linecap="round"/>
    <path d="M 90 66 Q 110 84 130 66" fill="none" stroke="#111111" stroke-width="6" stroke-linecap="round"/>`,
  // Kaget: alis naik, mata besar, mulut terbuka
  shocked: `
    <path d="M 84 30 Q 94 24 102 29" fill="none" stroke="#111111" stroke-width="5" stroke-linecap="round"/>
    <path d="M 118 29 Q 126 24 136 30" fill="none" stroke="#111111" stroke-width="5" stroke-linecap="round"/>
    <circle cx="96" cy="48" r="8" fill="#111111"/><circle cx="124" cy="48" r="8" fill="#111111"/>
    <circle cx="98" cy="45" r="3" fill="#ffffff"/><circle cx="126" cy="45" r="3" fill="#ffffff"/>
    <ellipse cx="110" cy="76" rx="10" ry="13" fill="#111111"/>
    <ellipse cx="110" cy="80" rx="5" ry="6" fill="#e74c3c"/>`,
  // Mikir: satu alis naik, mata melirik, mulut datar
  thinking: `
    <path d="M 84 36 Q 94 32 102 35" fill="none" stroke="#111111" stroke-width="5" stroke-linecap="round"/>
    <path d="M 118 28 Q 128 24 136 28" fill="none" stroke="#111111" stroke-width="5" stroke-linecap="round"/>
    <circle cx="99" cy="50" r="6" fill="#111111"/><circle cx="127" cy="47" r="6" fill="#111111"/>
    <path d="M 98 76 L 122 76" fill="none" stroke="#111111" stroke-width="6" stroke-linecap="round"/>`,
  // Netral: mata dot + senyum tipis
  neutral: `
    <circle cx="96" cy="48" r="6" fill="#111111"/>
    <circle cx="124" cy="48" r="6" fill="#111111"/>
    <path d="M 98 72 Q 110 80 122 72" fill="none" stroke="#111111" stroke-width="5" stroke-linecap="round"/>`,
}

// Emotion scene (teks bebas dari AI) → ekspresi
function pickFace(emotion = '') {
  const e = String(emotion).toLowerCase()
  if (/(angry|tense|marah|tegang|war|konflik|furious)/.test(e)) return 'angry'
  if (/(sad|sedih|grim|tragic|melancholy|somber|gloomy)/.test(e)) return 'sad'
  if (/(happy|senang|joy|triumph|hopeful|excited|proud|glorious)/.test(e)) return 'happy'
  if (/(curious|mysterious|penasaran|thinking|wonder|intrigued)/.test(e)) return 'thinking'
  if (/(shock|surprise|kaget|dramatic|epic|awe|amazed)/.test(e)) return 'shocked'
  return 'neutral'
}

function head(face) {
  return `
    <circle cx="110" cy="52" r="46" fill="#ffffff" stroke="#ffffff" stroke-width="14"/>
    <circle cx="110" cy="52" r="46" fill="#ffffff" stroke="#111111" stroke-width="8"/>
    ${FACES[face] || FACES.neutral}`
}

// Tiap pose: badan (110,98)->(110,205), lalu lengan & kaki beda-beda
const POSES = [
  // 0: menunjuk ke depan (ke arah scene)
  [[110, 98, 110, 205], [110, 120, 185, 95], [110, 130, 60, 165], [110, 205, 70, 300], [110, 205, 150, 300]],
  // 1: berdiri netral, tangan sedikit terbuka
  [[110, 98, 110, 205], [110, 120, 60, 185], [110, 120, 160, 185], [110, 205, 75, 300], [110, 205, 145, 300]],
  // 2: kaget/takjub, dua tangan ke atas
  [[110, 98, 110, 205], [110, 118, 50, 55], [110, 118, 170, 55], [110, 205, 75, 300], [110, 205, 145, 300]],
  // 3: berjalan/bergegas
  [[110, 98, 110, 200], [110, 120, 170, 150], [110, 120, 55, 100], [110, 200, 50, 285], [110, 200, 165, 290]],
  // 4: berpikir, tangan ke dagu
  [[110, 98, 110, 205], [110, 125, 88, 78], [110, 130, 165, 175], [110, 205, 80, 300], [110, 205, 140, 300]],
]

// Emotion → pose yang cocok (tangan ikut ekspresi)
const FACE_POSE = { angry: 1, sad: 1, happy: 2, shocked: 2, thinking: 4, neutral: 0 }

function mascotSvg(face, poseIndex) {
  const pose = POSES[poseIndex % POSES.length]
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 320">${limbs(pose)}${head(face)}</svg>`
  )
}

/**
 * Composite narator ke buffer gambar scene.
 * Ekspresi ikut emotion scene; posisi kiri/kanan bergilir berdasarkan order_index.
 */
async function mascotOverlay(imageBuffer, orderIndex = 0, emotion = '') {
  const img = sharp(imageBuffer)
  const meta = await img.metadata()
  const W = meta.width || 1792
  const H = meta.height || 1024

  const face = pickFace(emotion)
  // Pose ikut ekspresi; kalau netral, bergilir biar variatif
  const poseIndex = face === 'neutral' ? orderIndex % POSES.length : FACE_POSE[face]

  // Lebih kecil dari karakter in-scene — dia narator di pojok, bukan pemeran utama
  const mascotH = Math.round(H * 0.34)
  const mascotW = Math.round(mascotH * (220 / 320))

  const onRight = orderIndex % 2 === 1
  let mascotPng = sharp(mascotSvg(face, poseIndex)).resize(mascotW, mascotH)
  if (onRight) mascotPng = mascotPng.flop() // hadap ke arah scene saat di sisi kanan

  const overlay = await mascotPng.png().toBuffer()
  const margin = Math.round(W * 0.03)

  return sharp(imageBuffer)
    .composite([{
      input: overlay,
      left: onRight ? W - mascotW - margin : margin,
      top: H - mascotH - Math.round(H * 0.05),
    }])
    .jpeg({ quality: 90 })
    .toBuffer()
}

module.exports = { mascotOverlay }
