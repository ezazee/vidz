import { NextResponse } from 'next/server'
import { generateResearch } from '@/lib/ai/research'
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

  try {
    const output = await generateResearch(projects[0].topic)

    const rows = await sql`
      INSERT INTO research (project_id, summary, facts, timeline, "references", status)
      VALUES (
        ${id},
        ${output.summary},
        ${JSON.stringify(output.facts)}::jsonb,
        ${JSON.stringify(output.timeline)}::jsonb,
        ${JSON.stringify(output.references)}::jsonb,
        'completed'
      )
      RETURNING *
    `

    // Chain to next stage if requested
    const url = new URL(request.url)
    if (url.searchParams.get('chain') === 'true') {
      fetch(`${baseUrl}/api/projects/${id}/director?chain=true`, { method: 'POST' })
        .catch(err => console.error('[Research] Failed to chain to director:', err))
    }

    return NextResponse.json({ research: rows[0] })
  } catch (error) {
    console.error('[Research] Failed:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export const maxDuration = 60;

