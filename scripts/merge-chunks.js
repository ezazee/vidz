const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

async function main() {
  console.log('--- STARTING SEAMLESS CHUNK MERGING ---')
  
  const chunks = []
  // Cari semua part yang ada di disk (maksimal 20 part)
  for (let i = 1; i <= 20; i++) {
    const partPath = `video-part-${i}/part-${i}.mp4`
    if (fs.existsSync(partPath)) {
      chunks.push({
        index: i,
        path: partPath
      })
    }
  }

  if (chunks.length === 0) {
    console.error('Error: No video chunks found to merge!')
    process.exit(1)
  }

  console.log(`Found ${chunks.length} chunks to merge:`)
  chunks.forEach(c => console.log(` - Part ${c.index}: ${c.path}`))

  // Buat direktori output jika belum ada
  if (!fs.existsSync('output')) {
    fs.mkdirSync('output')
  }

  // Jika hanya ada 1 chunk, langsung copy saja tanpa re-encode
  if (chunks.length === 1) {
    console.log('Only 1 chunk found. Copying directly to final.mp4...')
    fs.copyFileSync(chunks[0].path, 'output/final.mp4')
    console.log('Successfully copied to output/final.mp4')
    return
  }

  // Bangun argumen perintah ffmpeg dengan filter_complex concat
  // Contoh: ffmpeg -i part1.mp4 -i part2.mp4 -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[outv][outa]" -map "[outv]" -map "[outa]" output/final.mp4
  const inputs = chunks.map(c => `-i "${c.path}"`).join(' ')
  
  let filterComplex = ''
  chunks.forEach((c, idx) => {
    filterComplex += `[${idx}:v][${idx}:a]`
  })
  filterComplex += `concat=n=${chunks.length}:v=1:a=1[outv][outa]`

  // Gunakan encoding preset superfast agar cepat, crf 22 untuk kualitas visual sangat baik
  const ffmpegCmd = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[outv]" -map "[outa]" -c:v libx264 -preset superfast -crf 22 -c:a aac -b:a 192k output/final.mp4`

  console.log('Running FFmpeg Seamless Merge Command:')
  console.log(ffmpegCmd)

  try {
    execSync(ffmpegCmd, { stdio: 'inherit' })
    console.log('✓ Successfully merged all video chunks seamlessly!')
  } catch (err) {
    console.error('Error executing FFmpeg merge command:', err.message)
    process.exit(1)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
