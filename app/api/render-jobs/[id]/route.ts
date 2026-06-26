import { NextResponse } from 'next/server'
import { z } from 'zod'
import { env } from '@/lib/env'
import { getSql } from '@/lib/db/client'

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

    try {
      // 1. Ambil detail topik proyek untuk teks headline clickbait
      const projectDetails = await sql`
        SELECT topic FROM projects WHERE id = ${projectId} LIMIT 1
      `
      const topic = projectDetails[0]?.topic || 'Sejarah Misteri'

      // 2. Tentukan Model dan Kredensial AI untuk Generasi Gambar Unik
      const aiBaseUrl = process.env.AI_BASE_URL
      const aiApiKey = process.env.AI_API_KEY
      const modelName = process.env.IMAGE_MODEL || process.env.AI_IMAGE_MODEL || 'cf/@cf/stabilityai/stable-diffusion-xl-base-1.0'

      if (aiBaseUrl && aiApiKey) {
        console.log(`Pipeline generating a COMPLETELY UNIQUE AI background image for project ${projectId} thumbnail...`)

        // Buat prompt gambar khusus untuk YouTube Thumbnail (High contrast, dramatic, clickable)
        const thumbnailImagePrompt = `A high-contrast, dramatic, highly engaging YouTube thumbnail background image for a documentary about: ${topic}. Cinematic lighting, highly detailed, 8k resolution, photorealistic, no text, no logos, no banners, epic composition.`

        // 3. Panggil API AI untuk generate gambar unik
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
            // 4. Unduh buffer gambar unik yang baru saja digenerate
            const bgImgRes = await fetch(generatedImgUrl)
            if (bgImgRes.ok) {
              const bgBuffer = Buffer.from(await bgImgRes.arrayBuffer())

              // 5. Buat Headline Clickbait 2 Baris yang Sangat Menarik
              const getClickbaitHeadline = (title: string) => {
                const t = title.toLowerCase()
                if (t.includes('proklamasi')) {
                  return { line1: 'MISTERI NYATA!', line2: 'PROKLAMASI 1945' }
                }
                if (t.includes('majapahit')) {
                  return { line1: 'RAHASIA HILANG!', line2: 'MAJAPAHIT' }
                }
                if (t.includes('makan') || t.includes('bakso')) {
                  return { line1: 'TERNYATA BEGINI!', line2: 'MAKAN BAKSO' }
                }
                
                const words = title.split(' ')
                const line2 = words.slice(0, 2).join(' ').toUpperCase()
                const dramaticHooks = ['TERUNGKAP!', 'MISTERI BESAR!', 'RAHASIA NYATA!', 'FAKTA ANEH!', 'MISTERI HILANG!']
                const line1 = dramaticHooks[Math.floor(Math.random() * dramaticHooks.length)]
                return { line1, line2 }
              }

              const { line1, line2 } = getClickbaitHeadline(topic)

              // 6. Buat SVG Overlay dengan Vignette & Outline Teks Tebal
              const svgOverlay = `
                <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
                      <stop offset="15%" stop-color="#000000" stop-opacity="0.10" />
                      <stop offset="60%" stop-color="#000000" stop-opacity="0.60" />
                      <stop offset="100%" stop-color="#000000" stop-opacity="0.92" />
                    </radialGradient>
                  </defs>
                  <rect width="1280" height="720" fill="url(#vignette)" />
                  <g transform="translate(90, 360)">
                    <!-- Line 1: Hook (Kuning Clickbait) -->
                    <text x="0" y="-45" font-family="Impact, Arial, sans-serif" font-weight="900" font-size="88" fill="#fbbf24" stroke="#000000" stroke-width="14" stroke-linejoin="round" text-anchor="left" dominant-baseline="middle">
                      ${line1}
                    </text>
                    <!-- Line 2: Topik Utama (Putih Kontras) -->
                    <text x="0" y="55" font-family="Impact, Arial, sans-serif" font-weight="900" font-size="76" fill="#ffffff" stroke="#000000" stroke-width="14" stroke-linejoin="round" text-anchor="left" dominant-baseline="middle">
                      ${line2}
                    </text>
                  </g>
                </svg>
              `

              // 7. Jalankan Sharp untuk menggabungkan background unik dengan SVG overlay
              const sharp = require('sharp')
              const compositeBuffer = await sharp(bgBuffer)
                .resize(1280, 720, { fit: 'cover' })
                .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
                .png()
                .toBuffer()

              // 8. Upload thumbnail hasil composite ke Vercel Blob
              const blobToken = process.env.BLOB_READ_WRITE_TOKEN
              if (blobToken) {
                const filename = `thumbnails/pipeline-unique-${projectId}-${Date.now()}.png`
                const uploadRes = await fetch(`https://blob.vercel-storage.com/${filename}`, {
                  method: 'PUT',
                  headers: {
                    Authorization: `Bearer ${blobToken}`,
                    'Content-Type': 'image/png',
                    'x-content-type': 'image/png',
                  },
                  body: compositeBuffer,
                })

                if (uploadRes.ok) {
                  const uploadData = await uploadRes.json()
                  const pipelineThumbnailUrl = uploadData.url
                  console.log(`Pipeline successfully uploaded unique clickbait cover: ${pipelineThumbnailUrl}`)

                  // Simpan sebagai thumbnail resmi di database
                  await sql`
                    INSERT INTO thumbnails (project_id, prompt, image_url, overlay_text, status)
                    VALUES (${projectId}, 'pipeline_unique_clickbait', ${pipelineThumbnailUrl}, ${line1 + ' ' + line2}, 'completed')
                  `
                } else {
                  console.error(`Failed to upload unique pipeline thumbnail: ${uploadRes.statusText}`)
                }
              }
            }
          }
        } else {
          console.error(`Failed to generate unique AI thumbnail background: ${aiRes.status} ${aiRes.statusText}`)
        }
      } else {
        console.warn('AI credentials (AI_BASE_URL or AI_API_KEY) missing. Skipping unique thumbnail generation.')
      }
    } catch (err) {
      console.error('Failed to automatically generate unique clickbait pipeline thumbnail:', err)
    }
  }

  return NextResponse.json({ render_job: rows[0] })
}
