const fs = require('fs/promises')
const { put } = require('@vercel/blob')

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN required')

  const videoPath = 'output/final.mp4'
  const buffer = await fs.readFile(videoPath)
  const filename = `videos/${Date.now()}-final.mp4`

  console.log(`Uploading ${videoPath} to Vercel Blob using official SDK...`)

  // Menggunakan SDK resmi @vercel/blob untuk menangani multipart upload file besar secara otomatis
  const blob = await put(filename, buffer, {
    access: 'public',
    token: token,
    contentType: 'video/mp4',
  })

  const videoUrl = blob.url
  console.log(`VIDEO_URL=${videoUrl}`)

  // Tulis URL ke file agar langkah pipeline berikutnya di GitHub Actions dapat membacanya
  await fs.writeFile('output/video_url.txt', videoUrl)
}

main().catch(e => {
  console.error('Blob upload failed:', e.message)
  process.exit(1)
})
