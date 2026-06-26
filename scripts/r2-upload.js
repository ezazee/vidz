const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucketName = process.env.R2_BUCKET_NAME
const publicUrl = process.env.R2_PUBLIC_URL

const s3Client = new S3Client({
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
  region: 'auto',
})

/**
 * Mengunggah buffer berkas ke Cloudflare R2 di tingkat skrip runner Node.js
 */
async function uploadToR2(filename, buffer, contentType) {
  if (!bucketName || !publicUrl) {
    throw new Error('R2_BUCKET_NAME and R2_PUBLIC_URL are required')
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    Body: buffer,
    ContentType: contentType,
  })

  await s3Client.send(command)

  const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl
  return `${cleanPublicUrl}/${filename}`
}

module.exports = { uploadToR2 }
