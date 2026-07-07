import { NextResponse } from 'next/server'
import { z } from 'zod'
import { env } from '@/lib/env'
import { getSql } from '@/lib/db/client'
import { sendTelegram } from '@/lib/telegram'

const updateJobSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  video_url: z.string().url().optional(),
  error: z.string().optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const sql = getSql()
  const rows = await sql`SELECT * FROM render_jobs WHERE id = ${id} LIMIT 1`
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ render_job: rows[0] })
}

export async function PATCH(request: Request, context: RouteContext) {
  const secret = request.headers.get('x-api-secret')

  if (!env.API_SECRET || secret !== env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const body = updateJobSchema.parse(await request.json())
  const sql = getSql()

  const rows = await sql`
    UPDATE render_jobs
    SET status = ${body.status},
        video_url = ${body.video_url ?? null},
        error = ${body.error ?? null},
        completed_at = CASE WHEN ${body.status} = 'completed' THEN now() ELSE completed_at END
    WHERE id = ${id}
    RETURNING *
  `

  if (!rows[0]) {
    return NextResponse.json({ error: 'Render job not found' }, { status: 404 })
  }

  if (body.status === 'completed') {
    const projectId = rows[0].project_id
    await sql`
      UPDATE projects
      SET status = 'rendered'
      WHERE id = ${projectId}
    `

    let topic = 'Dokumenter'
    let autoPublish = false
    try {
      // 1. Ambil detail proyek
      const projectDetails = await sql`
        SELECT topic, auto_publish FROM projects WHERE id = ${projectId} LIMIT 1
      `
      topic = projectDetails[0]?.topic || 'Dokumenter'
      autoPublish = !!projectDetails[0]?.auto_publish

      // 2. Background split: dunia asli (kiri) vs skenario alternatif (kanan)
      const aiBaseUrl = process.env.AI_BASE_URL
      const aiApiKey = process.env.AI_API_KEY
      const modelName = process.env.IMAGE_MODEL || 'cf/@cf/black-forest-labs/flux-1-schnell'
      const { THUMBNAIL_BG_STYLE, composeThumbnail } = await import('@/lib/thumbnail')
      const cleanTopic = topic.replace(/\s*\[THEME:.*?\]\s*/gi, '')

      const genBg = async (scene: string): Promise<Buffer | null> => {
        if (!aiBaseUrl || !aiApiKey) return null
        try {
          const aiRes = await fetch(`${aiBaseUrl}/images/generations`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${aiApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: modelName,
              prompt: `${THUMBNAIL_BG_STYLE}. Scene: ${scene}. no text, no watermark, no photorealism, no realistic humans`,
              n: 1,
              size: '1792x1024',
              response_format: 'url',
            }),
          })
          if (!aiRes.ok) return null
          const aiData = await aiRes.json()
          if (aiData.data?.[0]?.b64_json) return Buffer.from(aiData.data[0].b64_json, 'base64')
          if (aiData.data?.[0]?.url) {
            const bgImgRes = await fetch(aiData.data[0].url)
            if (bgImgRes.ok) return Buffer.from(await bgImgRes.arrayBuffer())
          }
          return null
        } catch {
          return null
        }
      }

      let [bgLeft, bgRight] = await Promise.all([
        genBg(`the real historical events related to ${cleanTopic}, dark gloomy grim atmosphere, ruins and smoke, muted colors`),
        genBg(`epic alternate reality of ${cleanTopic}, golden glorious prosperous city, bright vivid colors, triumphant atmosphere`),
      ])

      // Fallback: gambar scene pertama
      if (!bgLeft && !bgRight) {
        const firstScene = await sql`
          SELECT image_url FROM scenes
          WHERE project_id = ${projectId} AND image_url IS NOT NULL AND image_url != ''
          ORDER BY order_index ASC LIMIT 1
        `
        if (firstScene[0]?.image_url) {
          try {
            const sceneImgUrl = firstScene[0].image_url.startsWith('http')
              ? firstScene[0].image_url
              : `${process.env.MINIO_PUBLIC_URL}/${process.env.MINIO_BUCKET}/${firstScene[0].image_url}`
            const bgImgRes = await fetch(sceneImgUrl)
            if (bgImgRes.ok) bgLeft = Buffer.from(await bgImgRes.arrayBuffer())
          } catch (e) {
            console.error('Failed to fetch first scene image for thumbnail:', e)
          }
        }
      }

      if (bgLeft || bgRight) {
        // 3. Compose template split-screen konsisten
        const compositeBuffer = await composeThumbnail({
          bgLeft: (bgLeft ?? bgRight)!,
          bgRight: bgRight ?? undefined,
          title: cleanTopic,
        })

        const { uploadToR2 } = await import('@/lib/r2')
        const filename = `projects/${projectId}/thumbnails/auto-${Date.now()}.jpg`
        const thumbnailUrl = await uploadToR2(filename, compositeBuffer, 'image/jpeg')
        console.log(`✓ Thumbnail berhasil dibuat: ${thumbnailUrl}`)

        await sql`
          INSERT INTO thumbnails (project_id, prompt, image_url, overlay_text, status)
          VALUES (${projectId}, 'render_auto', ${thumbnailUrl}, ${cleanTopic}, 'completed')
        `
      } else {
        console.warn('Tidak bisa membuat thumbnail: tidak ada background tersedia.')
      }
    } catch (err) {
      console.error('Failed to generate thumbnail or publish:', err)
    }

    // Auto-publish ke YouTube kalau diaktifkan
    if (autoPublish) {
      try {
        const origin = process.env.API_BASE_URL || 'https://vidz-factory.vercel.app'
        await fetch(`${origin}/api/projects/${projectId}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-secret': process.env.API_SECRET || '' },
          body: JSON.stringify({}),
        })
        console.log(`[AutoPublish] Triggered for project ${projectId}`)
      } catch (pubErr) {
        console.error('[AutoPublish] Failed:', pubErr)
        await sendTelegram(`⚠️ <b>Auto-publish gagal</b>\n\nProyek: ${topic}\nCek log Vercel untuk detail.`)
      }
    }
  }

  return NextResponse.json({ render_job: rows[0] })
}
