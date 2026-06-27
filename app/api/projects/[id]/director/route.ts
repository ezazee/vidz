import { NextResponse } from 'next/server'
import { generateDirector } from '@/lib/ai/director'
import { getSql } from '@/lib/db/client'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const baseUrl = new URL(request.url).origin
  const sql = getSql()

  const projects = await sql`SELECT id, topic FROM projects WHERE id = ${id} LIMIT 1`
  if (!projects[0]) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const researchRows = await sql`
    SELECT summary, facts, timeline, "references"
    FROM research
    WHERE project_id = ${id}
    ORDER BY created_at DESC
    LIMIT 1
  `

  if (!researchRows[0]) {
    return NextResponse.json({ error: 'Research must be completed first' }, { status: 409 })
  }

  try {
    const output = await generateDirector({
      topic: projects[0].topic,
      research: {
        summary: researchRows[0].summary ?? '',
        facts: researchRows[0].facts ?? [],
        timeline: researchRows[0].timeline ?? [],
        references: researchRows[0].references ?? [],
      },
    })

    const rows = await sql`
      INSERT INTO director (
        project_id, genre, visual_style, emotion, lighting, color_palette,
        thumbnail_style, voice_style, camera_style, transition, image_style,
        visual_bible, character_bible, environment_bible, camera_bible,
        motion_bible, thumbnail_bible, status
      )
      VALUES (
        ${id}, ${output.genre}, ${output.visual_style}, ${output.emotion}, ${output.lighting},
        ${JSON.stringify(output.color_palette)}::jsonb, ${output.thumbnail_style}, ${output.voice_style},
        ${output.camera_style}, ${output.transition}, ${output.image_style},
        ${JSON.stringify(output.visual_bible)}::jsonb, ${JSON.stringify(output.character_bible)}::jsonb,
        ${JSON.stringify(output.environment_bible)}::jsonb, ${JSON.stringify(output.camera_bible)}::jsonb,
        ${JSON.stringify(output.motion_bible)}::jsonb, ${JSON.stringify(output.thumbnail_bible)}::jsonb, 'completed'
      )
      RETURNING *
    `

    // Chain to next stage if requested
    const url = new URL(request.url)
    if (url.searchParams.get('chain') === 'true') {
      fetch(`${baseUrl}/api/projects/${id}/outline?chain=true`, { method: 'POST' })
        .catch(err => console.error('[Director] Failed to chain to outline:', err))
    }

    return NextResponse.json({ director: rows[0] })
  } catch (error) {
    console.error('[Director] Failed:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export const maxDuration = 60;

