import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sql = getSql()

  try {
    // Ambil data proyek, gabungkan dengan pekerjaan render terbaru dan status unggahan YouTube terbaru
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
        u.status as upload_status
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
