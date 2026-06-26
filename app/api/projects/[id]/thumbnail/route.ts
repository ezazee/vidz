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
    const body = await request.json()
    const { image, overlay_text, style } = body

    if (!image || !image.startsWith('data:image/png;base64,')) {
      return NextResponse.json({ error: 'Format gambar Base64 PNG diperlukan' }, { status: 400 })
    }

    // 1. Dapatkan Vercel Blob Token
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN tidak terkonfigurasi di server.' }, { status: 500 })
    }

    // 2. Decode Base64 image
    const base64Data = image.replace(/^data:image\/png;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // 3. Kirim ke Vercel Blob Storage secara langsung via HTTP PUT
    const filename = `thumbnails/${id}-${Date.now()}.png`
    console.log(`Uploading customized thumbnail for project ${id} to Vercel Blob: ${filename}...`)

    const blobRes = await fetch(`https://blob.vercel-storage.com/${filename}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'image/png',
        'x-content-type': 'image/png',
      },
      body: buffer,
    })

    if (!blobRes.ok) {
      const errDetail = await blobRes.text().catch(() => '')
      throw new Error(`Blob upload failed: ${blobRes.status} ${blobRes.statusText}. Detail: ${errDetail}`)
    }

    const blobData = await blobRes.json()
    const imageUrl = blobData.url

    // 4. Simpan ke tabel thumbnails di database
    await sql`
      INSERT INTO thumbnails (project_id, prompt, image_url, overlay_text, status)
      VALUES (${id}, ${style || 'vox'}, ${imageUrl}, ${overlay_text || null}, 'completed')
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
