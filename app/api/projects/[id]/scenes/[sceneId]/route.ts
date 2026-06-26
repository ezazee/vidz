import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'

interface RouteContext {
  params: Promise<{ id: string; sceneId: string }>
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  const { id, sceneId } = await context.params
  const apiSecret = request.headers.get('x-api-secret')
  const sql = getSql()

  // Validasi token keamanan API secret
  if (!apiSecret || apiSecret !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { image_url, image_status, voice_url, voice_status, duration } = body

    // Perbarui fields di tabel scenes secara kondisional
    const rows = await sql`
      UPDATE scenes
      SET 
        image_url = COALESCE(${image_url ?? null}, image_url),
        image_status = COALESCE(${image_status ?? null}, image_status),
        voice_url = COALESCE(${voice_url ?? null}, voice_url),
        voice_status = COALESCE(${voice_status ?? null}, voice_status),
        duration = COALESCE(${duration !== undefined ? Number(duration) : null}, duration),
        updated_at = now()
      WHERE id = ${sceneId} AND project_id = ${id}
      RETURNING *
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Adegan tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ scene: rows[0] })
  } catch (error) {
    console.error('Error updating scene:', error)
    return NextResponse.json({ error: 'Gagal memperbarui data adegan' }, { status: 500 })
  }
}
