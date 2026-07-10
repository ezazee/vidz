import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'
import { resolveChannelId } from '@/lib/channels'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params
  const sql = getSql(resolveChannelId(request))

  try {
    const statuses = await sql`
      SELECT
        p.id,
        p.status as project_status,
        (SELECT status FROM research WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1) as research_status,
        (SELECT status FROM director WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1) as director_status,
        (SELECT status FROM outlines WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1) as outline_status,
        (
          SELECT 
            CASE 
              WHEN COUNT(*) = 0 THEN 'idle'
              WHEN bool_and(image_status = 'completed' AND voice_status = 'completed') THEN 'completed'
              ELSE 'processing'
            END
          FROM scenes WHERE project_id = p.id
        ) as scenes_status,
        (SELECT status FROM render_jobs WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1) as render_status,
        (SELECT video_url FROM render_jobs WHERE project_id = p.id AND status = 'completed' ORDER BY created_at DESC LIMIT 1) as video_url,
        (SELECT error FROM render_jobs WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1) as render_error,
        (SELECT github_run_id FROM render_jobs WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1) as github_run_id,
        (SELECT COUNT(*) FROM scenes WHERE project_id = p.id) as total_scenes,
        (SELECT COUNT(*) FROM scenes WHERE project_id = p.id AND image_status = 'completed') as images_done,
        (SELECT COUNT(*) FROM scenes WHERE project_id = p.id AND voice_status = 'completed') as voices_done
      FROM projects p
      WHERE p.id = ${id}
    `

    if (statuses.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const row = statuses[0]

    // Kalau project status 'processing' atau 'ai_completed', semua stage yang masih 'idle' dianggap 'processing'
    const projectProcessing = ['processing', 'ai_completed'].includes(row.project_status)

    const resolveStage = (status: string | null, prevCompleted: boolean) => {
      if (status === 'completed') return 'completed'
      if (status === 'failed') return 'failed'
      if (projectProcessing && prevCompleted) return 'processing'
      return 'idle'
    }

    const aiCompleted = ['ai_completed', 'rendered', 'uploaded'].includes(row.project_status)
    const researchDone = row.research_status === 'completed'
    const directorDone = row.director_status === 'completed'
    const outlineDone = row.outline_status === 'completed'

    const total = Number(row.total_scenes ?? 0)
    const imagesDone = Number(row.images_done ?? 0)
    const voicesDone = Number(row.voices_done ?? 0)

    return NextResponse.json({
      success: true,
      projectStatus: row.project_status,
      stages: {
        research: resolveStage(row.research_status, true),
        director: resolveStage(row.director_status, researchDone),
        outline: resolveStage(row.outline_status, directorDone),
        // scenes = done kalau AI pipeline selesai (ai_completed/rendered/uploaded)
        scenes: aiCompleted ? 'completed' : resolveStage(row.scenes_status, outlineDone),
        render: row.render_status || 'idle'
      },
      renderDetail: {
        githubRunId: row.github_run_id || null,
        totalScenes: total,
        imagesDone,
        voicesDone,
      },
      videoUrl: row.video_url || null,
      error: row.render_error || null
    })
  } catch (error) {
    console.error('Error fetching pipeline status:', error)
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}
