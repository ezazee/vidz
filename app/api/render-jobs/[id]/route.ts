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
      // 1. Ambil detail proyek dan scene pertama
      const projectDetails = await sql`
        SELECT topic, auto_publish FROM projects WHERE id = ${projectId} LIMIT 1
      `
      topic = projectDetails[0]?.topic || 'Dokumenter'
      autoPublish = !!projectDetails[0]?.auto_publish

      // 2. Ambil gambar scene pertama sebagai background thumbnail (paling relevan dengan topik)
      const firstScene = await sql`
        SELECT image_url FROM scenes 
        WHERE project_id = ${projectId} AND image_url IS NOT NULL AND image_url != ''
        ORDER BY order_index ASC LIMIT 1
      `

      let bgBuffer: Buffer | null = null

      // Prioritas 1: Gunakan gambar scene pertama (sudah pasti relevan dengan topik)
      if (firstScene[0]?.image_url) {
        try {
          const sceneImgUrl = firstScene[0].image_url.startsWith('http')
            ? firstScene[0].image_url
            : `${process.env.MINIO_PUBLIC_URL}/${process.env.MINIO_BUCKET}/${firstScene[0].image_url}`
          console.log(`Thumbnail: Menggunakan gambar scene pertama sebagai background...`)
          const bgImgRes = await fetch(sceneImgUrl)
          if (bgImgRes.ok) {
            bgBuffer = Buffer.from(await bgImgRes.arrayBuffer())
          }
        } catch (e) {
          console.error('Failed to fetch first scene image for thumbnail:', e)
        }
      }

      // Prioritas 2: Jika tidak ada gambar scene, generate AI background
      if (!bgBuffer) {
        const aiBaseUrl = process.env.AI_BASE_URL
        const aiApiKey = process.env.AI_API_KEY
        const modelName = process.env.IMAGE_MODEL || process.env.AI_IMAGE_MODEL || 'cf/@cf/stabilityai/stable-diffusion-xl-base-1.0'

        if (aiBaseUrl && aiApiKey) {
          console.log(`Thumbnail: Tidak ada gambar scene, generate AI background...`)
          const thumbnailImagePrompt = `vibrant colorful hand-drawn cartoon illustration, webcomic style, thick black ink outlines, rich saturated colors, a cute stick figure character with white round head and black stick limbs in a dramatic scene about: ${topic}. YouTube thumbnail composition, high contrast, richly detailed background, no text, no logos.`
          
          const aiRes = await fetch(`${aiBaseUrl}/images/generations`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${aiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: modelName,
              prompt: thumbnailImagePrompt,
              n: 1,
              size: '1792x1024',
              response_format: 'url',
            }),
          })

          if (aiRes.ok) {
            const aiData = await aiRes.json()
            const generatedImgUrl = aiData.data?.[0]?.url
            if (generatedImgUrl) {
              const bgImgRes = await fetch(generatedImgUrl)
              if (bgImgRes.ok) {
                bgBuffer = Buffer.from(await bgImgRes.arrayBuffer())
              }
            }
          }
        }
      }

      if (bgBuffer) {
        // 3. Format judul menjadi 2 baris
        const words = topic.split(' ')
        const midpoint = Math.ceil(words.length / 2)
        const line1 = (words.length <= 3 ? topic : words.slice(0, midpoint).join(' ')).toUpperCase()
        const line2 = words.length <= 3 ? '' : words.slice(midpoint).join(' ').toUpperCase()

        const svgOverlay = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
          <defs><radialGradient id="v" cx="50%" cy="50%" r="70%">
            <stop offset="15%" stop-color="#000" stop-opacity="0.10"/>
            <stop offset="60%" stop-color="#000" stop-opacity="0.60"/>
            <stop offset="100%" stop-color="#000" stop-opacity="0.92"/>
          </radialGradient></defs>
          <rect width="1280" height="720" fill="url(#v)"/>
          <g transform="translate(640,${line2 ? '330' : '360'})">
            <text x="0" y="0" font-family="Impact,Arial,sans-serif" font-weight="900" font-size="82" fill="#fbbf24" stroke="#000" stroke-width="12" stroke-linejoin="round" text-anchor="middle" dominant-baseline="middle">${line1}</text>
            ${line2 ? `<text x="0" y="90" font-family="Impact,Arial,sans-serif" font-weight="900" font-size="72" fill="#fff" stroke="#000" stroke-width="12" stroke-linejoin="round" text-anchor="middle" dominant-baseline="middle">${line2}</text>` : ''}
          </g></svg>`

        try {
          const sharp = require('sharp')
          const compositeBuffer = await sharp(bgBuffer)
            .resize(1280, 720, { fit: 'cover' })
            .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
            .jpeg({ quality: 90 })
            .toBuffer()

          const { uploadToR2 } = await import('@/lib/r2')
          const filename = `projects/${projectId}/thumbnails/auto-${Date.now()}.jpg`
          const thumbnailUrl = await uploadToR2(filename, compositeBuffer, 'image/jpeg')
          console.log(`✓ Thumbnail berhasil dibuat: ${thumbnailUrl}`)

          await sql`
            INSERT INTO thumbnails (project_id, prompt, image_url, overlay_text, status)
            VALUES (${projectId}, 'render_auto', ${thumbnailUrl}, ${(line1 + ' ' + line2).trim()}, 'completed')
          `
        } catch (sharpErr) {
          console.error('Sharp/R2 thumbnail upload failed:', sharpErr)
        }
      } else {
        console.warn('Tidak bisa membuat thumbnail: tidak ada gambar scene tersedia.')
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
