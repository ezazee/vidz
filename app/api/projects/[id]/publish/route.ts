import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  const { id } = await context.params
  const sql = getSql()

  try {
    // 1. Ambil Zernio API Key dan YouTube Account ID dari database
    const integrations = await sql`
      SELECT key, value FROM integrations 
      WHERE key IN ('zernio_api_key', 'youtube_account_id')
    `
    const config: Record<string, string> = {}
    for (const row of integrations) {
      config[row.key] = row.value
    }

    if (!config.zernio_api_key || !config.youtube_account_id) {
      return NextResponse.json({ error: 'Koneksi YouTube belum diaktifkan. Silakan hubungkan YouTube di tab Integrasi.' }, { status: 400 })
    }

    // 2. Ambil detail proyek dan tautan video MP4
    const projects = await sql`
      SELECT p.id, p.topic, rj.video_url 
      FROM projects p
      LEFT JOIN LATERAL (
        SELECT video_url FROM render_jobs 
        WHERE project_id = p.id AND status = 'completed' 
        ORDER BY created_at DESC LIMIT 1
      ) rj ON true
      WHERE p.id = ${id}
    `

    if (projects.length === 0) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 })
    }

    const project = projects[0]
    if (!project.video_url) {
      return NextResponse.json({ error: 'Video belum selesai dirender. Tunggu hingga status render selesai.' }, { status: 400 })
    }

    // 3. Ambil seluruh adegan storyboard untuk menyusun deskripsi video yang kaya informasi
    const scenes = await sql`
      SELECT narration FROM scenes 
      WHERE project_id = ${id} 
      ORDER BY order_index ASC
    `
    
    // Susun deskripsi video otomatis dari naskah sejarah adegan
    let videoDescription = `Video dokumenter otomatis tentang: ${project.topic}\n\n`
    if (scenes.length > 0) {
      videoDescription += "--- NARASI VIDEO ---\n"
      const combinedNarration = scenes.map(s => s.narration).filter(Boolean).join('\n\n')
      // Potong deskripsi jika terlalu panjang (batas YouTube sekitar 5000 karakter)
      videoDescription += combinedNarration.slice(0, 4000)
      if (combinedNarration.length > 4000) {
        videoDescription += '\n... (naskah dipotong karena batas karakter)'
      }
      videoDescription += '\n\n'
    }
    videoDescription += "Dihasilkan secara otomatis menggunakan kecerdasan buatan (AI) di StoryZ Studio."

    console.log(`Publishing video for project ${id} to YouTube account ${config.youtube_account_id}...`)

    // 4. Kirim permintaan posting/upload ke Zernio API
    const zernioRes = await fetch('https://zernio.com/api/v1/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.zernio_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId: config.youtube_account_id,
        title: project.topic,
        body: videoDescription,
        videoUrl: project.video_url,
        publishNow: true
      }),
    })

    if (!zernioRes.ok) {
      const errText = await zernioRes.text().catch(() => '')
      throw new Error(`Zernio publishing failed: ${zernioRes.status} ${zernioRes.statusText}. Detail: ${errText}`)
    }

    const zernioData = await zernioRes.json()
    const postId = zernioData.id || zernioData.postId || 'pending'

    // 5. Catat riwayat unggahan ke tabel uploads database
    const youtubeUrl = zernioData.url || zernioData.youtubeUrl || ''
    await sql`
      INSERT INTO uploads (project_id, youtube_id, youtube_url, status)
      VALUES (${id}, ${postId}, ${youtubeUrl}, 'processing')
      ON CONFLICT DO NOTHING
    `

    // Perbarui status proyek menjadi 'uploaded' di tabel projects
    await sql`
      UPDATE projects SET status = 'uploaded', updated_at = now() WHERE id = ${id}
    `

    return NextResponse.json({
      success: true,
      postId,
      message: 'Video berhasil didaftarkan untuk diunggah ke channel YouTube Anda!',
      youtubeUrl,
    })
  } catch (error) {
    console.error('Error publishing to YouTube:', error)
    const errMsg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Gagal memublikasikan video ke YouTube: ${errMsg}` }, { status: 500 })
  }
}
