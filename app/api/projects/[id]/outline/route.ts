import { NextResponse } from 'next/server'
import { generateOutline } from '@/lib/ai/outline'
import { getSql } from '@/lib/db/client'

interface RouteContext {
  params: Promise<{ id: string }>
}
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const sql = getSql()

  const projects = await sql`SELECT id, topic FROM projects WHERE id = ${id} LIMIT 1`
  if (!projects[0]) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const research = await sql`SELECT summary FROM research WHERE project_id = ${id} ORDER BY created_at DESC LIMIT 1`
  if (!research[0]) return NextResponse.json({ error: 'Research must be completed first' }, { status: 409 })

  try {
    const output = await generateOutline(projects[0].topic, research[0].summary)

    const rows = await sql`
      INSERT INTO outlines (project_id, structure, status)
      VALUES (${id}, ${JSON.stringify(output)}::jsonb, 'completed')
      RETURNING *
    `

    return NextResponse.json({ outline: rows[0] })
  } catch (error) {
    console.error('[Outline] Failed:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export const maxDuration = 60;

