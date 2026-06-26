const fs = require('fs/promises')
const path = require('path')

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN required')

  const videoPath = 'output/final.mp4'
  const buffer = await fs.readFile(videoPath)
  const filename = `videos/${Date.now()}-final.mp4`

  // Vercel Blob PUT upload
  const res = await fetch(`https://blob.vercel-storage.com/${filename}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'video/mp4',
      'x-content-type': 'video/mp4',
    },
    body: buffer,
  })

  if (!res.ok) throw new Error(`Blob upload failed: ${res.status} ${res.statusText}`)

  const data = await res.json()
  const videoUrl = data.url
  console.log(`VIDEO_URL=${videoUrl}`)

  // write to file so next step can read it
  await fs.writeFile('output/video_url.txt', videoUrl)
}

main().catch(e => { console.error(e); process.exit(1) })
