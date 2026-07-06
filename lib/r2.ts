import { S3Client, PutObjectCommand, DeleteObjectsCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const endpoint = process.env.MINIO_ENDPOINT
const accessKeyId = process.env.MINIO_ACCESS_KEY
const secretAccessKey = process.env.MINIO_SECRET_KEY
const bucketName = process.env.MINIO_BUCKET
const region = process.env.MINIO_REGION || 'us-east-1'
const publicUrl = process.env.MINIO_PUBLIC_URL // e.g. https://minio-api.zaportfolio.my.id

export const s3Client = new S3Client({
  endpoint,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
  region,
  forcePathStyle: true, // required for MinIO
})

/**
 * Mengunggah buffer berkas ke MinIO dan mengembalikan URL publiknya
 */
export async function uploadToR2(filename: string, buffer: Buffer, contentType: string): Promise<string> {
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

/**
 * Menghapus satu atau beberapa aset dari MinIO berdasarkan URL publiknya
 */
export async function deleteFromR2(urls: string[]): Promise<void> {
  if (!bucketName || !publicUrl || urls.length === 0) return

  const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl
  const prefix = `${cleanPublicUrl}/${bucketName}/`

  const keys = urls
    .map(url => (url.includes(prefix) ? url.replace(prefix, '') : null))
    .filter((key): key is string => !!key)

  if (keys.length === 0) return

  try {
    if (keys.length === 1) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: keys[0],
      }))
    } else {
      await s3Client.send(new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: keys.map(key => ({ Key: key })),
        },
      }))
    }
    console.log(`Successfully deleted ${keys.length} assets from MinIO`)
  } catch (err) {
    console.error('Failed to delete assets from MinIO:', err)
  }
}
