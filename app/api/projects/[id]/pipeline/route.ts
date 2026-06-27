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

  // Start background processing without awaiting
  Promise.resolve().then(async () => {
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
      console.log(`[Pipeline] Running stage: ${stage} for project ${id}`)
      await markStageStatus(stage, 'processing')
      let fetchUrl = `${baseUrl}/api/projects/${id}/${stage}`
      if (fetchUrl.includes('localhost')) fetchUrl = fetchUrl.replace('localhost', '127.0.0.1')
      
      try {
        const res = await fetch(fetchUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (!res.ok) {
          const err = await res.text()
          console.error(`[Pipeline] Stage ${stage} failed for project ${id}:`, err)
          await markStageStatus(stage, 'failed')
          return // Stop pipeline on error
        }
        console.log(`[Pipeline] Stage ${stage} completed for project ${id}`)
      } catch (err) {
        console.error(`[Pipeline] Stage ${stage} threw an error for project ${id}:`, err)
        await markStageStatus(stage, 'failed')
        return // Stop pipeline on error
      }
    }

    console.log(`[Pipeline] All AI stages completed for project ${id}. Triggering render...`)
    
    try {
      const renderRes = await fetch(`${baseUrl}/api/projects/${id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'full' }),
      })
      if (!renderRes.ok) {
        const err = await renderRes.text()
        console.error(`[Pipeline] Render trigger failed for project ${id}:`, err)
      } else {
        console.log(`[Pipeline] Render successfully triggered for project ${id}`)
      }
    } catch (err) {
      console.error(`[Pipeline] Render trigger threw an error for project ${id}:`, err)
    }
  })

  // Return immediately to the client
  return NextResponse.json({
    success: true,
    message: 'Pipeline started in background',
    projectId: id
  }, { status: 202 })
}
