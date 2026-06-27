import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'
import { dispatchAiPipeline } from '@/lib/github/dispatch'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const baseUrl = new URL(request.url).origin
  const sql = getSql()

  // Verify project exists
  const projects = await sql`SELECT id FROM projects WHERE id = ${id} LIMIT 1`
  if (projects.length === 0) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // We update project status to 'processing' to indicate the pipeline is active
  await sql`UPDATE projects SET status = 'draft' WHERE id = ${id}` // it's already draft, but just in case

  console.log(`[Pipeline] Dispatching GitHub Action for AI pipeline project ${id}`)

  const markStageStatus = async (stage: string, status: 'processing' | 'failed') => {
    try {
      if (stage === 'outlines' || stage === 'outline') {
        await sql`INSERT INTO outlines (project_id, structure, status) VALUES (${id}, '{}'::jsonb, ${status})`
      } else if (stage === 'director') {
         await sql`INSERT INTO director (project_id, visual_style, voice_style, image_style, camera_style, transition, emotion, status) VALUES (${id}, '', '', '', '', '', '', ${status})`
      } else if (stage === 'research') {
         await sql`INSERT INTO research (project_id, summary, status) VALUES (${id}, '', ${status})`
      } else if (stage === 'scenes') {
         await sql`INSERT INTO scenes (project_id, order_index, narration, subtitle, image_prompt, camera, effect, emotion, transition, duration, image_status, voice_status) VALUES (${id}, 0, '', '', '', '', '', '', '', 0, ${status}, ${status})`
      }
    } catch (e) {
      console.error(`[Pipeline] Failed to mark stage ${stage} as ${status} in DB:`, e)
    }
  }

  const stages = ['research', 'director', 'outline', 'scenes']
  for (const stage of stages) {
    await markStageStatus(stage, 'processing')
  }

  try {
    await dispatchAiPipeline(id, baseUrl)
    console.log(`[Pipeline] GitHub Action successfully dispatched for project ${id}`)
  } catch (err) {
    console.error(`[Pipeline] Failed to dispatch GitHub Action for project ${id}:`, err)
    for (const stage of stages) {
      await markStageStatus(stage, 'failed')
    }
    return NextResponse.json({ error: 'Failed to dispatch pipeline' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Pipeline dispatched to GitHub Actions',
    projectId: id
  }, { status: 202 })
}

export const maxDuration = 60;

