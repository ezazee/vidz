const fs = require('fs/promises')

async function main() {
  const storyboard = JSON.parse(await fs.readFile('storyboard.json', 'utf8')).storyboard
  const fps = 30
  
  // Hitung total durasi video
  let totalDuration = 0
  for (const scene of storyboard.scenes) {
    totalDuration += Number(scene.duration || 6)
  }
  
  const totalFrames = Math.max(1, Math.round(totalDuration * fps))
  console.log(`Total duration: ${totalDuration} seconds`)
  console.log(`Total frames: ${totalFrames}`)
  
  // Bagi menjadi 8 potongan (chunks) seimbang
  const numChunks = 8
  const chunkSize = Math.floor(totalFrames / numChunks)
  const chunks = []
  
  for (let i = 0; i < numChunks; i++) {
    const startFrame = i * chunkSize
    // Potongan terakhir akan mengambil sisa frame yang ada
    const endFrame = i === numChunks - 1 ? totalFrames - 1 : (i + 1) * chunkSize - 1
    
    if (startFrame < totalFrames) {
      chunks.push({
        part: i + 1,
        frames: `${startFrame}-${Math.min(endFrame, totalFrames - 1)}`
      })
    }
  }
  
  const matrixJson = JSON.stringify(chunks)
  console.log(`Generated matrix: ${matrixJson}`)
  
  // Tulis output untuk dibaca oleh langkah GitHub Actions berikutnya
  if (process.env.GITHUB_OUTPUT) {
    await fs.appendFile(process.env.GITHUB_OUTPUT, `matrix=${matrixJson}\n`)
    console.log(`Successfully wrote matrix to GITHUB_OUTPUT`)
  } else {
    console.log(`GITHUB_OUTPUT is not defined. Skipping writing output.`)
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
