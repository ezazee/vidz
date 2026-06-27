import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'

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

  console.log(`[Pipeline] Starting background pipeline for project ${id}`)

  // Start background processing by triggering the first stage
  const fetchUrl = `${baseUrl}/api/projects/${id}/research?chain=true`
  fetch(fetchUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }).catch(err => {
    console.error(`[Pipeline] Failed to trigger research for project ${id}:`, err)
  })

  // Return immediately to the client
  return NextResponse.json({
    success: true,
    message: 'Pipeline started in background',
    projectId: id
  }, { status: 202 })
}

export const maxDuration = 60;

