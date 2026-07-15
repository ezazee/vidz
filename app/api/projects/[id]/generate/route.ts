import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSql } from '@/lib/db/client'
import { dispatchRenderWorkflow } from '@/lib/github/dispatch'
import { resolveChannelId } from '@/lib/channels'

const generateSchema = z.object({
  mode: z.enum(['full', 'partial', 'short']).default('full'),
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

  let sceneIds = body.scene_ids
  if (body.mode === 'short' && !sceneIds) {
    // Short dipicu tanpa scene_ids eksplisit → pakai chapter yang sudah dipilih AI
    // saat AI pipeline jalan (scripts/run-pipeline.ts → projects.short_scene_ids).
    const proj = await sql`SELECT short_scene_ids FROM projects WHERE id = ${id}`
    sceneIds = proj[0]?.short_scene_ids ?? undefined
    if (!sceneIds || sceneIds.length === 0) {
      return NextResponse.json({ error: 'Belum ada short_scene_ids untuk project ini — jalankan AI pipeline dulu.' }, { status: 400 })
    }
  }

  const jobs = await sql`
    INSERT INTO render_jobs (project_id, mode, scene_ids, status)
    VALUES (${id}, ${body.mode}, ${sceneIds ? JSON.stringify(sceneIds) : null}::jsonb, 'pending')
    RETURNING *
  `

  await dispatchRenderWorkflow({
    projectId: id,
    jobId: jobs[0].id,
    mode: body.mode,
    sceneIds,
    channelId,
  })

  return NextResponse.json({ render_job: jobs[0] }, { status: 202 })
}
