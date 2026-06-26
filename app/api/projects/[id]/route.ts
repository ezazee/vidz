import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'
import { deleteFromR2 } from '@/lib/r2'
import { env } from '@/lib/env'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sql = getSql()

  try {
    // Ambil data proyek, gabungkan dengan pekerjaan render terbaru, status unggahan YouTube terbaru, dan metadata SEO
    const rows = await sql`
      SELECT 
        p.id, 
        p.topic, 
        p.status as project_status, 
        p.created_at,
        rj.status as render_status,
        rj.video_url,
        rj.error,
        u.youtube_url,
        u.status as upload_status,
        seo.title as seo_title,
        seo.description as seo_description,
        seo.tags as seo_tags,
        seo.hashtags as seo_hashtags
      FROM projects p
      LEFT JOIN LATERAL (
        SELECT status, video_url, error 
        FROM render_jobs 
        WHERE project_id = p.id 
        ORDER BY created_at DESC 
        LIMIT 1
      ) rj ON true
      LEFT JOIN LATERAL (
        SELECT youtube_url, status 
        FROM uploads 
        WHERE project_id = p.id 
        ORDER BY created_at DESC 
        LIMIT 1
      ) u ON true
      LEFT JOIN LATERAL (
        SELECT title, description, tags, hashtags 
        FROM seo_metadata 
        WHERE project_id = p.id 
        ORDER BY created_at DESC 
        LIMIT 1
      ) seo ON true
      WHERE p.id = ${id}
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ project: rows[0] })
  } catch (error) {
    console.error('Error fetching single project:', error)
    return NextResponse.json({ error: 'Gagal mengambil data proyek' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sql = getSql()

  try {
    // 1. Ambil data proyek untuk mengecek keberadaannya
    const projects = await sql`
      SELECT id FROM projects WHERE id = ${id} LIMIT 1
    `
    if (projects.length === 0) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 })
    }

    // 2. Kumpulkan semua URL aset yang perlu dihapus dari Vercel Blob
    const scenes = await sql`
      SELECT image_url, voice_url FROM scenes WHERE project_id = ${id}
    `
    const renderJobs = await sql`
      SELECT video_url, github_run_id, status FROM render_jobs WHERE project_id = ${id}
    `

    const urlsToDelete: string[] = []
    const r2PublicDomain = (process.env.R2_PUBLIC_URL || '').replace(/^https?:\/\//, '')
    
    // Tambahkan URL gambar dan suara scene (mendukung Vercel Blob lama & Cloudflare R2 baru)
    for (const scene of scenes) {
      if (scene.image_url && (scene.image_url.includes('vercel-storage.com') || (r2PublicDomain && scene.image_url.includes(r2PublicDomain)))) {
        urlsToDelete.push(scene.image_url)
      }
      if (scene.voice_url && (scene.voice_url.includes('vercel-storage.com') || (r2PublicDomain && scene.voice_url.includes(r2PublicDomain)))) {
        urlsToDelete.push(scene.voice_url)
      }
    }

    // Tambahkan URL video hasil render
    for (const job of renderJobs) {
      if (job.video_url && (job.video_url.includes('vercel-storage.com') || (r2PublicDomain && job.video_url.includes(r2PublicDomain)))) {
        urlsToDelete.push(job.video_url)
      }
    }

    // 3. Batalkan GitHub Actions yang sedang berjalan jika ada
    if (env.GITHUB_TOKEN && env.GITHUB_REPO) {
      for (const job of renderJobs) {
        if (job.github_run_id && (job.status === 'pending' || job.status === 'processing')) {
          console.log(`Canceling GitHub Actions run ${job.github_run_id} for project ${id}...`)
          try {
            const cancelRes = await fetch(
              `https://api.github.com/repos/${env.GITHUB_REPO}/actions/runs/${job.github_run_id}/cancel`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${env.GITHUB_TOKEN}`,
                  Accept: 'application/vnd.github+json',
                  'Content-Type': 'application/json',
                },
              }
            )
            if (cancelRes.ok) {
              console.log(`Successfully requested cancellation for GitHub run ${job.github_run_id}`)
            } else {
              console.warn(`GitHub cancellation returned status: ${cancelRes.status}`)
            }
          } catch (gitErr) {
            console.error('Failed to cancel GitHub Actions run:', gitErr)
          }
        }
      }
    }

    // 4. Hapus berkas dari Cloudflare R2 & Vercel Blob jika ada URL
    if (urlsToDelete.length > 0) {
      console.log(`Deleting ${urlsToDelete.length} assets from cloud storage for project ${id}...`)
      try {
        // Hapus dari Cloudflare R2
        await deleteFromR2(urlsToDelete)
        
        // Bersihkan sisa Vercel Blob lama jika token dikonfigurasi
        if (env.BLOB_READ_WRITE_TOKEN) {
          const vercelUrls = urlsToDelete.filter(u => u.includes('vercel-storage.com'))
          if (vercelUrls.length > 0) {
            const { del } = await import('@vercel/blob')
            await del(vercelUrls)
          }
        }
      } catch (blobErr) {
        console.error('Failed to delete assets from cloud storage:', blobErr)
      }
    }

    // 5. Hapus proyek dari database (Foreign Key ON DELETE CASCADE akan otomatis menghapus semua baris di tabel terkait)
    await sql`
      DELETE FROM projects WHERE id = ${id}
    `
    console.log(`Project ${id} successfully deleted from database`)

    return NextResponse.json({ success: true, message: 'Proyek dan seluruh aset terkait berhasil dihapus' })
  } catch (error) {
    console.error('Error deleting project:', error)
    const errMsg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Gagal menghapus proyek: ${errMsg}` }, { status: 500 })
  }
}
