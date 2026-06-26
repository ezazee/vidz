import { NextResponse } from 'next/server'
import { generateScenes } from '@/lib/ai/scenes'
import { generateSeoMetadata } from '@/lib/ai/seo'
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

  const researchRows = await sql`SELECT summary FROM research WHERE project_id = ${id} ORDER BY created_at DESC LIMIT 1`
  const summary = researchRows[0]?.summary ?? ''

  const outline = outlineRows[0].structure as { sections: OutlineSection[] }
  const director = directorRows[0] as DirectorOutput

  // hapus scenes lama dulu
  await sql`DELETE FROM scenes WHERE project_id = ${id}`

  // Hitung offset indeks urutan (orderOffset) di awal untuk tiap bab agar pemanggilan dapat diparalelkan
  let currentOffset = 0
  const sectionsWithOffsets = outline.sections.map((section) => {
    const numScenes = section.type === 'intro' || section.type === 'ending' ? 6 : 8
    const offset = currentOffset
    currentOffset += numScenes
    return { section, offset }
  })

  // Jalankan semua pemanggilan AI generator adegan secara paralel (concurrency)
  // Hal ini memangkas waktu pengerjaan dari ~5 menit menjadi ~15-20 detik, mencegah Vercel Timeout 300s
  const scenesPromises = sectionsWithOffsets.map(({ section, offset }) => {
    return generateScenes({
      section,
      topic: projects[0].topic,
      director,
      orderOffset: offset,
      fullOutline: outline.sections,
    })
  })

  const scenesResults = await Promise.all(scenesPromises)
  const allScenes = []
  let globalOrderIndex = 0

  for (const scenes of scenesResults) {
    for (const scene of scenes) {
      scene.order_index = globalOrderIndex++
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
  }

  // Gabungkan seluruh teks narasi untuk input generasi SEO
  const narrationText = allScenes.map(s => s.narration).filter(Boolean).join('\n\n')

  // Bersihkan SEO lama jika ada
  await sql`DELETE FROM seo_metadata WHERE project_id = ${id}`

  // Hasilkan metadata SEO secara paralel/asinkron tanpa menunda respons adegan
  try {
    const seo = await generateSeoMetadata({
      topic: projects[0].topic,
      summary,
      narrationText,
    })

    await sql`
      INSERT INTO seo_metadata (project_id, title, description, tags, hashtags, status)
      VALUES (
        ${id},
        ${seo.title},
        ${seo.description},
        ${JSON.stringify(seo.tags)}::jsonb,
        ${JSON.stringify(seo.hashtags)}::jsonb,
        'completed'
      )
    `
    console.log(`SEO Metadata successfully generated for project ${id}`)
  } catch (seoErr) {
    console.error('Gagal memproses AI SEO Metadata:', seoErr)
  }

  return NextResponse.json({ scenes: allScenes, count: allScenes.length })
}
