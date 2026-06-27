import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params
  const sql = getSql()

  try {
    const statuses = await sql`
      SELECT 
        p.id,
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
        (SELECT error FROM render_jobs WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1) as render_error
      FROM projects p
      WHERE p.id = ${id}
    `

    if (statuses.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const row = statuses[0]
    
    // For scenes, if there are no rows yet, we check if outline is completed.
    // If outline is completed but scenes are 'idle' (0 rows), it might mean scenes are currently generating.
    // Actually, `app/api/projects/[id]/scenes/route.ts` inserts rows *after* generating. So before they are inserted, it will be 'idle'.
    // A better way is: if outline is completed but scenes is idle, it implies scenes is 'processing'.
    let scenes_status = row.scenes_status
    if (scenes_status === 'idle' && row.outline_status === 'completed') {
      scenes_status = 'processing'
    }

    return NextResponse.json({
      success: true,
      stages: {
        research: row.research_status || 'idle',
        director: row.director_status || 'idle',
        outline: row.outline_status || 'idle',
        scenes: scenes_status || 'idle',
        render: row.render_status || 'idle'
      },
      videoUrl: row.video_url || null,
      error: row.render_error || null
    })
  } catch (error) {
    console.error('Error fetching pipeline status:', error)
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}
