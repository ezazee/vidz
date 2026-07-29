import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'
import type { ChannelId } from '@/lib/channels'

export const dynamic = 'force-dynamic'

/**
 * GET /api/render-jobs — daftar render job terbaru untuk halaman Render Queue.
 * Read-only; tidak menyentuh alur render sama sekali (PATCH status tetap di
 * /api/render-jobs/[id], dipakai GitHub Actions).
 */
export async function GET(request: Request) {
  const channelId = (request.headers.get('x-channel-id') || undefined) as ChannelId | undefined
  const sql = getSql(channelId === 'cabang-sejarah' ? undefined : channelId)

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get('limit')) || 40, 100)

  try {
    const rows = await sql`
      SELECT
        r.id,
        r.project_id,
        r.mode,
        r.status,
        r.video_url,
        r.gh_run_id,
        r.error,
        r.started_at,
        r.completed_at,
        r.created_at,
        p.topic,
        p.status AS project_status
      FROM render_jobs r
      LEFT JOIN projects p ON p.id = r.project_id
      ORDER BY r.created_at DESC
      LIMIT ${limit}
    `
    return NextResponse.json({ jobs: rows })
  } catch (err) {
    console.error('[render-jobs] gagal memuat daftar:', err)
    return NextResponse.json({ error: 'Gagal memuat render job' }, { status: 500 })
  }
}
