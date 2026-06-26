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
    await sql`
      UPDATE projects
      SET status = 'rendered'
      WHERE id = ${rows[0].project_id}
    `
  }

  return NextResponse.json({ render_job: rows[0] })
}
