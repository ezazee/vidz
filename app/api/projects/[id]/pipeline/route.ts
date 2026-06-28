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

  await sql`UPDATE projects SET status = 'processing' WHERE id = ${id}`

  console.log(`[Pipeline] Dispatching GitHub Action for AI pipeline project ${id}`)

  try {
    await dispatchAiPipeline(id, baseUrl)
    console.log(`[Pipeline] GitHub Action successfully dispatched for project ${id}`)
  } catch (err) {
    console.error(`[Pipeline] Failed to dispatch GitHub Action for project ${id}:`, err)
    await sql`UPDATE projects SET status = 'draft' WHERE id = ${id}`
    return NextResponse.json({ error: 'Failed to dispatch pipeline' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Pipeline dispatched to GitHub Actions',
    projectId: id
  }, { status: 202 })
}

export const maxDuration = 60;

