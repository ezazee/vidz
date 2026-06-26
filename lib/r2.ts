import { S3Client, PutObjectCommand, DeleteObjectsCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucketName = process.env.R2_BUCKET_NAME
const publicUrl = process.env.R2_PUBLIC_URL // e.g. https://pub-xxx.r2.dev

export const s3Client = new S3Client({
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
  region: 'auto',
})

/**
 * Mengunggah buffer berkas ke Cloudflare R2 dan mengembalikan URL publiknya
 */
export async function uploadToR2(filename: string, buffer: Buffer, contentType: string): Promise<string> {
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

/**
 * Menghapus satu atau beberapa aset dari Cloudflare R2 berdasarkan URL publiknya
 */
export async function deleteFromR2(urls: string[]): Promise<void> {
  if (!bucketName || !publicUrl || urls.length === 0) return

  const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl

  const keys = urls
    .map(url => {
      if (url.includes(cleanPublicUrl)) {
        return url.replace(`${cleanPublicUrl}/`, '')
      }
      return null
    })
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
    console.log(`Successfully deleted ${keys.length} assets from Cloudflare R2`)
  } catch (err) {
    console.error('Failed to delete assets from Cloudflare R2:', err)
  }
}
