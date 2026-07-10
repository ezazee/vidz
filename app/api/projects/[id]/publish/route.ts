import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'
import { resolveChannelId, getChannel } from '@/lib/channels'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  const { id } = await context.params
  const channelId = resolveChannelId(request)
  const sql = getSql(channelId)
  const channel = getChannel(channelId)

  const body = await request.json().catch(() => ({}))
  // #8 Jitter jam posting: geser +7..+38 menit acak supaya tidak selalu tayang
  // di menit bulat yang sama tiap hari (pola bot). Hanya maju, tak pernah mundur ke masa lalu.
  let scheduledAt: string | undefined = body.scheduledAt // e.g. "2026-06-29T12:00:00.000Z"
  if (scheduledAt) {
    const jitterMs = (7 + Math.floor(Math.random() * 32)) * 60 * 1000
    scheduledAt = new Date(new Date(scheduledAt).getTime() + jitterMs).toISOString()
  }

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

    // 2. Ambil detail proyek, tautan video MP4, dan metadata SEO
    const projects = await sql`
      SELECT 
        p.id, 
        p.topic, 
        rj.video_url,
        th.image_url as thumbnail_url,
        seo.title as seo_title,
        seo.description as seo_description,
        seo.hashtags as seo_hashtags
      FROM projects p
      LEFT JOIN LATERAL (
        SELECT video_url FROM render_jobs 
        WHERE project_id = p.id AND status = 'completed' 
        ORDER BY created_at DESC LIMIT 1
      ) rj ON true
      LEFT JOIN LATERAL (
        SELECT image_url FROM thumbnails
        WHERE project_id = p.id AND status = 'completed'
        ORDER BY created_at DESC LIMIT 1
      ) th ON true
      LEFT JOIN LATERAL (
        SELECT title, description, hashtags 
        FROM seo_metadata 
        WHERE project_id = p.id 
        ORDER BY created_at DESC LIMIT 1
      ) seo ON true
      WHERE p.id = ${id}
    `

    if (projects.length === 0) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 })
    }

    const project = projects[0]
    if (!project.video_url) {
      return NextResponse.json({ error: 'Video belum selesai dirender. Tunggu hingga status render selesai.' }, { status: 400 })
    }

    // 3. Ambil seluruh adegan storyboard untuk menyusun deskripsi video cadangan (fallback)
    const scenes = await sql`
      SELECT narration FROM scenes 
      WHERE project_id = ${id} 
      ORDER BY order_index ASC
    `
    
    // Susun deskripsi & judul teroptimasi SEO AI
    let rawTitle = (project.seo_title || project.topic).trim();
    // Hapus kutip ganda/tunggal di awal dan akhir yang mungkin di-generate AI
    rawTitle = rawTitle.replace(/^["']|["']$/g, '').trim();
    
    // Batas karakter judul YouTube adalah 100
    const finalTitle = rawTitle.length > 100 ? rawTitle.slice(0, 97) + '...' : rawTitle;
    let finalDescription = ''

    if (project.seo_description) {
      finalDescription = project.seo_description
      
      try {
        let hashtags = project.seo_hashtags
        if (typeof hashtags === 'string') {
          hashtags = JSON.parse(hashtags)
        }
        if (Array.isArray(hashtags) && hashtags.length > 0) {
          finalDescription += '\n\n' + hashtags.join(' ')
        }
      } catch (e) {
        console.warn('Gagal memparsing hashtags', e)
      }
    } else {
      // Fallback jika data SEO AI belum terbuat
      finalDescription = `Video dokumenter otomatis tentang: ${project.topic}\n\n`
      if (scenes.length > 0) {
        finalDescription += "--- NARASI VIDEO ---\n"
        const combinedNarration = scenes.map(s => s.narration).filter(Boolean).join('\n\n')
        finalDescription += combinedNarration.slice(0, 4000)
        if (combinedNarration.length > 4000) {
          finalDescription += '\n... (naskah dipotong karena batas karakter)'
        }
        finalDescription += '\n\n'
      }
      finalDescription += "Dihasilkan secara otomatis menggunakan kecerdasan buatan (AI) di StoryZ Studio."
    }

    console.log(`Publishing video for project ${id} to YouTube account ${config.youtube_account_id}...`)

    // Zernio: title field diabaikan, YouTube title diambil dari baris pertama content
    // Per docs.zernio.com/platforms/youtube: thumbnail masuk sebagai field `thumbnail`
    // di DALAM item video pada mediaItems (bukan options/youTubeOptions/mediaItem terpisah).
    const mediaItems: { url: string; type: string; thumbnail?: string }[] = []
    if (project.video_url) {
      mediaItems.push({
        url: project.video_url,
        type: 'video',
        ...(project.thumbnail_url ? { thumbnail: project.thumbnail_url } : {}),
      })
    }

    // YouTube title = baris pertama content — pisah dengan newline
    const contentWithTitle = `${finalTitle}\n\n${finalDescription}`

    // Pinned comment otomatis (docs.zernio.com: platformSpecificData.firstComment) —
    // menambah sentuhan editorial/ajakan diskusi, bukan cuma video hasil generate mentah.
    // project.topic mentah masih bawa tag [THEME:...] — wajib dibersihkan sebelum ditampilkan.
    const topicForComment = project.topic.replace(/\s*\[THEME:.*?\]\s*/gi, '').trim()
    const firstComment = channel.language === 'en'
      ? `Have you ever caught yourself doing this? Drop your own experience in the comments below! 🧠`
      : `Menurutmu, seberapa besar kemungkinan skenario "${topicForComment}" ini beneran kejadian? Tulis pendapatmu di kolom komentar! 🧠`

    // 4. Kirim permintaan posting/upload ke Zernio API
    const zernioRes = await fetch('https://zernio.com/api/v1/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.zernio_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: finalTitle,
        content: contentWithTitle,
        platforms: [{
          platform: 'youtube',
          accountId: config.youtube_account_id,
          options: { privacyStatus: 'public' },
          platformSpecificData: { firstComment },
        }],
        mediaItems,
        publishNow: !scheduledAt,
        ...(scheduledAt ? { scheduleDate: scheduledAt } : {}),
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
      INSERT INTO uploads (project_id, youtube_id, youtube_url, status, scheduled_at)
      VALUES (${id}, ${postId}, ${youtubeUrl}, 'processing', ${scheduledAt ? new Date(scheduledAt) : null})
      ON CONFLICT DO NOTHING
    `

    // Perbarui status proyek menjadi 'uploaded' di tabel projects
    await sql`
      UPDATE projects SET status = 'uploaded', updated_at = now() WHERE id = ${id}
    `

    // Notif sukses dikirim oleh n8n (single source of truth) — tidak dari sini biar tidak dobel

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

export const maxDuration = 60
