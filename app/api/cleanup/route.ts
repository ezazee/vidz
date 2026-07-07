import { NextResponse } from 'next/server'
import { ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from '@/lib/r2'
import { getSql } from '@/lib/db/client'

// Bersihkan asset produksi MinIO untuk project yang videonya sudah terbit (status uploaded > 24 jam).
// Idempotent: aman dipanggil berulang. Thumbnail disisakan (dipakai UI library).
// Dipanggil harian oleh n8n jam 03:00 WIB.

const PREFIXES_TO_DELETE = ['images/', 'voices/', 'videos/']

async function deletePrefix(bucket: string, prefix: string): Promise<number> {
  let deleted = 0
  let token: string | undefined
  do {
    const list = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: token,
    }))
    const keys = (list.Contents ?? []).map(o => o.Key!).filter(Boolean)
    // MinIO menolak batch delete tanpa Content-MD5 — hapus satu-satu paralel
    await Promise.all(keys.map(key =>
      s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
        .then(() => { deleted++ })
        .catch((e: unknown) => console.error(`Cleanup gagal hapus ${key}:`, (e as Error).message))
    ))
    token = list.IsTruncated ? list.NextContinuationToken : undefined
  } while (token)
  return deleted
}

export async function POST() {
  const bucket = process.env.MINIO_BUCKET
  if (!bucket) return NextResponse.json({ error: 'MINIO_BUCKET belum diset' }, { status: 500 })

  const sql = getSql()
  try {
    // Uploaded > 24 jam (Zernio pasti sudah ambil file video) dan < 30 hari (batasi scan)
    const projects = await sql`
      SELECT id, topic FROM projects
      WHERE status = 'uploaded'
        AND updated_at < now() - interval '24 hours'
        AND updated_at > now() - interval '30 days'
    `

    let totalDeleted = 0
    const cleaned: string[] = []

    for (const p of projects) {
      let deletedForProject = 0
      for (const sub of PREFIXES_TO_DELETE) {
        deletedForProject += await deletePrefix(bucket, `projects/${p.id}/${sub}`)
      }
      if (deletedForProject > 0) {
        cleaned.push(p.id)
        totalDeleted += deletedForProject
        console.log(`Cleanup: ${p.id} (${p.topic?.slice(0, 40)}) — ${deletedForProject} objects`)
      }
    }

    return NextResponse.json({
      success: true,
      projectsScanned: projects.length,
      projectsCleaned: cleaned.length,
      objectsDeleted: totalDeleted,
    })
  } catch (e) {
    console.error('Cleanup error:', e)
    return NextResponse.json({ error: 'Cleanup gagal' }, { status: 500 })
  }
}

export const maxDuration = 300
