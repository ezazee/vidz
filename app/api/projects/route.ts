import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSql } from '@/lib/db/client'

const createProjectSchema = z.object({
  topic: z.string().min(3),
  user_id: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  const body = createProjectSchema.parse(await request.json())
  const sql = getSql()

  const rows = await sql`
    INSERT INTO projects (user_id, topic)
    VALUES (${body.user_id ?? '00000000-0000-0000-0000-000000000000'}, ${body.topic})
    RETURNING id, topic, status, created_at
  `

  return NextResponse.json({ project: rows[0] }, { status: 201 })
}

export async function GET() {
  const sql = getSql()

  try {
    const projects = await sql`
      SELECT 
        p.id, 
        p.topic, 
        p.status as project_status, 
        p.created_at,
        rj.status as render_status,
        rj.video_url,
        rj.error
      FROM projects p
      LEFT JOIN LATERAL (
        SELECT status, video_url, error 
        FROM render_jobs 
        WHERE project_id = p.id 
        ORDER BY created_at DESC 
        LIMIT 1
      ) rj ON true
      ORDER BY p.created_at DESC
    `

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}
