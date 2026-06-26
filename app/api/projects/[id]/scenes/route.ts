import { NextResponse } from 'next/server'
import { generateScenes } from '@/lib/ai/scenes'
import { getSql } from '@/lib/db/client'
import type { OutlineSection } from '@/lib/ai/outline'
import type { DirectorOutput } from '@/lib/pipeline/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const sql = getSql()

  const projects = await sql`SELECT id, topic FROM projects WHERE id = ${id} LIMIT 1`
  if (!projects[0]) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const outlineRows = await sql`SELECT structure FROM outlines WHERE project_id = ${id} ORDER BY created_at DESC LIMIT 1`
  if (!outlineRows[0]) return NextResponse.json({ error: 'Outline must be completed first' }, { status: 409 })

  const directorRows = await sql`SELECT * FROM director WHERE project_id = ${id} ORDER BY created_at DESC LIMIT 1`
  if (!directorRows[0]) return NextResponse.json({ error: 'Director must be completed first' }, { status: 409 })

  const outline = outlineRows[0].structure as { sections: OutlineSection[] }
  const director = directorRows[0] as DirectorOutput

  // hapus scenes lama dulu
  await sql`DELETE FROM scenes WHERE project_id = ${id}`

  let orderOffset = 0
  const allScenes = []

  for (const section of outline.sections) {
    const scenes = await generateScenes({ section, topic: projects[0].topic, director, orderOffset })

    for (const scene of scenes) {
      const row = await sql`
        INSERT INTO scenes (project_id, order_index, narration, subtitle, image_prompt, camera, effect, emotion, transition, duration, image_status, voice_status)
        VALUES (
          ${id}, ${scene.order_index}, ${scene.narration}, ${scene.subtitle},
          ${scene.image_prompt}, ${scene.camera}, ${scene.effect}, ${scene.emotion},
          ${scene.transition}, ${scene.duration}, 'idle', 'idle'
        )
        RETURNING *
      `
      allScenes.push(row[0])
    }

    orderOffset += scenes.length
  }

  return NextResponse.json({ scenes: allScenes, count: allScenes.length })
}
