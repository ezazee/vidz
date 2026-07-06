const sharp = require('sharp')

// Maskot "Si Cabang" — stick figure SVG yang di-composite ke background AI.
// Digambar kode (bukan AI) supaya karakternya 100% identik di setiap scene & video.
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

function head() {
  return `
    <circle cx="110" cy="52" r="46" fill="#ffffff" stroke="#ffffff" stroke-width="14"/>
    <circle cx="110" cy="52" r="46" fill="#ffffff" stroke="#111111" stroke-width="8"/>
    <circle cx="96" cy="48" r="6" fill="#111111"/>
    <circle cx="124" cy="48" r="6" fill="#111111"/>`
}

// Tiap pose: badan (110,98)->(110,205), lalu lengan & kaki beda-beda
const POSES = [
  // 0: menunjuk ke depan (kanan)
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

function mascotSvg(poseIndex) {
  const pose = POSES[poseIndex % POSES.length]
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 320">${limbs(pose)}${head()}</svg>`
  )
}

/**
 * Composite maskot ke buffer gambar background.
 * Pose & posisi (kiri/kanan) bergilir berdasarkan order_index biar tiap scene beda.
 */
async function mascotOverlay(imageBuffer, orderIndex = 0) {
  const img = sharp(imageBuffer)
  const meta = await img.metadata()
  const W = meta.width || 1792
  const H = meta.height || 1024

  const mascotH = Math.round(H * 0.42)
  const mascotW = Math.round(mascotH * (220 / 320))

  const onRight = orderIndex % 2 === 1
  let mascotPng = sharp(mascotSvg(orderIndex)).resize(mascotW, mascotH)
  if (onRight) mascotPng = mascotPng.flop() // hadap ke kiri saat di sisi kanan

  const overlay = await mascotPng.png().toBuffer()
  const margin = Math.round(W * 0.05)

  return sharp(imageBuffer)
    .composite([{
      input: overlay,
      left: onRight ? W - mascotW - margin : margin,
      top: H - mascotH - Math.round(H * 0.06),
    }])
    .jpeg({ quality: 90 })
    .toBuffer()
}

module.exports = { mascotOverlay }

// ponytail: self-check — node scripts/mascot.js menghasilkan sample untuk inspeksi visual
if (require.main === module) {
  ;(async () => {
    const bg = await sharp({ create: { width: 1792, height: 1024, channels: 3, background: '#3aa8a0' } }).jpeg().toBuffer()
    for (let i = 0; i < 5; i++) {
      const out = await mascotOverlay(bg, i)
      require('fs').writeFileSync(`/tmp/mascot-pose-${i}.jpg`, out)
    }
    console.log('OK: /tmp/mascot-pose-{0..4}.jpg')
  })()
}
