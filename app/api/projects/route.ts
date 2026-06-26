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
