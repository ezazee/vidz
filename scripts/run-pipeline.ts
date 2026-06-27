import { getSql } from '../lib/db/client'
import { generateResearch } from '../lib/ai/research'
import { generateDirector } from '../lib/ai/director'
import { generateOutline } from '../lib/ai/outline'
import { generateScenes } from '../lib/ai/scenes'
import { generateSeoMetadata } from '../lib/ai/seo'

async function runPipeline() {
  const id = process.argv[2]
  if (!id) {
    console.error('Project ID is required')
    process.exit(1)
  }
  
  console.log(`[Pipeline] Starting execution for project ${id} on GitHub Runner...`)
  const sql = getSql()
  
  try {
    const projects = await sql`SELECT id, topic FROM projects WHERE id = ${id} LIMIT 1`
    if (!projects[0]) throw new Error('Project not found')
    const topic = projects[0].topic

    // 1. Research
    console.log('[Pipeline] Running Research...')
    await sql`DELETE FROM research WHERE project_id = ${id}`
    const research = await generateResearch(topic)
    await sql`
      INSERT INTO research (project_id, summary, facts, timeline, "references", status)
      VALUES (
        ${id},
        ${research.summary},
        ${JSON.stringify(research.facts)}::jsonb,
        ${JSON.stringify(research.timeline)}::jsonb,
        ${JSON.stringify(research.references)}::jsonb,
        'completed'
      )
    `
    console.log('[Pipeline] Research completed.')

    // 2. Director
    console.log('[Pipeline] Running Director...')
    await sql`DELETE FROM director WHERE project_id = ${id}`
    const director = await generateDirector({ topic, research })
    await sql`
      INSERT INTO director (
        project_id, genre, visual_style, emotion, lighting, color_palette,
        thumbnail_style, voice_style, camera_style, transition, image_style,
        visual_bible, character_bible, environment_bible, camera_bible,
        motion_bible, thumbnail_bible, status
      )
      VALUES (
        ${id}, ${director.genre ?? ''}, ${director.visual_style}, ${director.emotion}, ${director.lighting ?? ''},
        ${JSON.stringify(director.color_palette ?? [])}::jsonb, ${director.thumbnail_style ?? ''}, ${director.voice_style},
        ${director.camera_style}, ${director.transition}, ${director.image_style},
        ${JSON.stringify(director.visual_bible ?? {})}::jsonb, ${JSON.stringify(director.character_bible ?? {})}::jsonb,
        ${JSON.stringify(director.environment_bible ?? {})}::jsonb, ${JSON.stringify(director.camera_bible ?? {})}::jsonb,
        ${JSON.stringify(director.motion_bible ?? {})}::jsonb, ${JSON.stringify(director.thumbnail_bible ?? {})}::jsonb, 'completed'
      )
    `
    console.log('[Pipeline] Director completed.')

    // 3. Outline
    console.log('[Pipeline] Running Outline...')
    await sql`DELETE FROM outlines WHERE project_id = ${id}`
    const outline = await generateOutline(topic, research.summary)
    await sql`
      INSERT INTO outlines (project_id, structure, status)
      VALUES (${id}, ${JSON.stringify(outline)}::jsonb, 'completed')
    `
    console.log('[Pipeline] Outline completed.')

    // 4. Scenes
    console.log('[Pipeline] Running Scenes...')
    await sql`DELETE FROM scenes WHERE project_id = ${id}`
    await sql`DELETE FROM seo_metadata WHERE project_id = ${id}`
    
    const allScenes: any[] = []
    let currentOffset = 0
    let globalOrderIndex = 0

    for (const section of outline.sections) {
      console.log(`[Pipeline] Generating scenes for section: ${section.type} - ${section.title}...`)
      const numScenes = section.type === 'intro' || section.type === 'ending' ? 6 : 8
      
      const scenes = await generateScenes({
        section,
        topic,
        director,
        orderOffset: currentOffset,
        fullOutline: outline.sections,
      })
      
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
      
      currentOffset += numScenes
    }
    console.log(`[Pipeline] Scenes completed. Total: ${allScenes.length} scenes.`)

    // 5. SEO
    console.log('[Pipeline] Running SEO...')
    const narrationText = allScenes.map(s => s.narration).filter(Boolean).join('\n\n')
    const seo = await generateSeoMetadata({
      topic,
      summary: research.summary,
      narrationText,
    })
    await sql`
      INSERT INTO seo_metadata (project_id, title, description, tags, hashtags, status)
      VALUES (
        ${id}, ${seo.title}, ${seo.description},
        ${JSON.stringify(seo.tags)}::jsonb, ${JSON.stringify(seo.hashtags)}::jsonb,
        'completed'
      )
    `
    console.log('[Pipeline] SEO completed.')

    console.log('[Pipeline] ✅ All AI stages completed successfully!')
    process.exit(0)
  } catch (err) {
    console.error('[Pipeline] Error:', err)
    process.exit(1)
  }
}

runPipeline()
