const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')

const endpoint = process.env.MINIO_ENDPOINT
const accessKeyId = process.env.MINIO_ACCESS_KEY
const secretAccessKey = process.env.MINIO_SECRET_KEY
const bucketName = process.env.MINIO_BUCKET
const region = process.env.MINIO_REGION || 'us-east-1'
const publicUrl = process.env.MINIO_PUBLIC_URL

const s3Client = new S3Client({
  endpoint,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
  region,
  forcePathStyle: true, // required for MinIO
})

/**
 * Mengunggah buffer berkas ke MinIO di tingkat skrip runner Node.js
 */
async function uploadToR2(filename, buffer, contentType) {
  if (!bucketName || !publicUrl) {
    throw new Error('MINIO_BUCKET and MINIO_PUBLIC_URL are required')
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    Body: buffer,
    ContentType: contentType,
  })

  await s3Client.send(command)

  const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl
  return `${cleanPublicUrl}/${bucketName}/${filename}`
}

module.exports = { uploadToR2 }
