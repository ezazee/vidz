const fs = require('fs')
const { S3Client } = require('@aws-sdk/client-s3')
const { Upload } = require('@aws-sdk/lib-storage')

async function main() {
  const accessKeyId = process.env.MINIO_ACCESS_KEY
  if (!accessKeyId) throw new Error('MinIO credentials required (MINIO_ACCESS_KEY)')

  const videoPath = 'output/final.mp4'
  const projectId = process.env.PROJECT_ID || 'global'
  const filename = `projects/${projectId}/videos/${Date.now()}-final.mp4`
  const bucketName = process.env.MINIO_BUCKET
  const publicUrl = process.env.MINIO_PUBLIC_URL

  const sizeMb = (fs.statSync(videoPath).size / 1024 / 1024).toFixed(1)
  console.log(`Uploading final video ${videoPath} (${sizeMb} MB) to MinIO via multipart...`)

  const s3Client = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT,
    credentials: { accessKeyId, secretAccessKey: process.env.MINIO_SECRET_KEY || '' },
    region: process.env.MINIO_REGION || 'us-east-1',
    forcePathStyle: true,
  })

  // Multipart 50MB/part — video besar tetap lolos walau ada proxy dengan limit body size
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucketName,
      Key: filename,
      Body: fs.createReadStream(videoPath),
      ContentType: 'video/mp4',
    },
    partSize: 50 * 1024 * 1024,
    queueSize: 3,
  })
  upload.on('httpUploadProgress', p => {
    if (p.loaded && p.total) console.log(`  progress: ${((p.loaded / p.total) * 100).toFixed(0)}%`)
  })
  await upload.done()

  const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl
  const videoUrl = `${cleanPublicUrl}/${bucketName}/${filename}`
  console.log(`VIDEO_URL=${videoUrl}`)

  // Tulis URL ke file agar langkah pipeline berikutnya di GitHub Actions dapat membacanya
  fs.writeFileSync('output/video_url.txt', videoUrl)
}

main().catch(e => {
  console.error('MinIO video upload failed:', e.message)
  process.exit(1)
})
