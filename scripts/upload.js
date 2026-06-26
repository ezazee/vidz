const fs = require('fs/promises')
const { uploadToR2 } = require('./r2-upload')

async function main() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  if (!accessKeyId) throw new Error('R2 credentials required (R2_ACCESS_KEY_ID)')

  const videoPath = 'output/final.mp4'
  const buffer = await fs.readFile(videoPath)
  const projectId = process.env.PROJECT_ID || 'global'
  const filename = `projects/${projectId}/videos/${Date.now()}-final.mp4`

  console.log(`Uploading final video ${videoPath} to Cloudflare R2 using SDK...`)

  // Mengunggah video final ke Cloudflare R2
  const videoUrl = await uploadToR2(filename, buffer, 'video/mp4')
  console.log(`VIDEO_URL=${videoUrl}`)

  // Tulis URL ke file agar langkah pipeline berikutnya di GitHub Actions dapat membacanya
  await fs.writeFile('output/video_url.txt', videoUrl)
}

main().catch(e => {
  console.error('R2 Video upload failed:', e.message)
  process.exit(1)
})
