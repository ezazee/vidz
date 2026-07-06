const fs = require('fs/promises')
const { uploadToR2 } = require('./r2-upload')

async function main() {
  const accessKeyId = process.env.MINIO_ACCESS_KEY
  if (!accessKeyId) throw new Error('MinIO credentials required (MINIO_ACCESS_KEY)')

  const videoPath = 'output/final.mp4'
  const buffer = await fs.readFile(videoPath)
  const projectId = process.env.PROJECT_ID || 'global'
  const filename = `projects/${projectId}/videos/${Date.now()}-final.mp4`

  console.log(`Uploading final video ${videoPath} to MinIO using SDK...`)

  // Mengunggah video final ke MinIO
  const videoUrl = await uploadToR2(filename, buffer, 'video/mp4')
  console.log(`VIDEO_URL=${videoUrl}`)

  // Tulis URL ke file agar langkah pipeline berikutnya di GitHub Actions dapat membacanya
  await fs.writeFile('output/video_url.txt', videoUrl)
}

main().catch(e => {
  console.error('MinIO video upload failed:', e.message)
  process.exit(1)
})
