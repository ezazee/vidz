import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSql } from '@/lib/db/client'
import { dispatchRenderWorkflow } from '@/lib/github/dispatch'
import { resolveChannelId } from '@/lib/channels'

const generateSchema = z.object({
  mode: z.enum(['full', 'partial']).default('full'),
  scene_ids: z.array(z.string().uuid()).optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const body = generateSchema.parse(await request.json().catch(() => ({})))
  const channelId = resolveChannelId(request)
  const sql = getSql(channelId)

  const jobs = await sql`
    INSERT INTO render_jobs (project_id, mode, scene_ids, status)
    VALUES (${id}, ${body.mode}, ${body.scene_ids ? JSON.stringify(body.scene_ids) : null}::jsonb, 'pending')
    RETURNING *
  `

  await dispatchRenderWorkflow({
    projectId: id,
    jobId: jobs[0].id,
    mode: body.mode,
    sceneIds: body.scene_ids,
    channelId,
  })

  return NextResponse.json({ render_job: jobs[0] }, { status: 202 })
}
