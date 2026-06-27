import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'
import { uploadToR2 } from '@/lib/r2'

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
    const body = await request.json()
    const { image, imageUrl, overlay_text, style } = body

    let finalImageUrl = imageUrl
    if (image && image.startsWith('data:image/png;base64,')) {
      const base64Data = image.replace(/^data:image\/png;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      const filename = `projects/${id}/thumbnails/${Date.now()}.png`
      console.log(`Uploading customized thumbnail for project ${id} to Cloudflare R2: ${filename}...`)
      finalImageUrl = await uploadToR2(filename, buffer, 'image/png')
    }

    if (!finalImageUrl) {
      return NextResponse.json({ error: 'Format gambar Base64 PNG atau imageUrl diperlukan' }, { status: 400 })
    }

    // 4. Simpan ke tabel thumbnails di database
    await sql`
      INSERT INTO thumbnails (project_id, prompt, image_url, overlay_text, status)
      VALUES (${id}, ${style || 'ai_pure'}, ${finalImageUrl}, ${overlay_text || null}, 'completed')
    `

    console.log(`Thumbnail successfully saved for project ${id}: ${imageUrl}`)

    return NextResponse.json({
      success: true,
      imageUrl,
      message: 'Thumbnail berhasil disimpan ke Library!'
    })

  } catch (error) {
    console.error('Error saving custom thumbnail:', error)
    const errMsg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Gagal menyimpan thumbnail: ${errMsg}` }, { status: 500 })
  }
}
