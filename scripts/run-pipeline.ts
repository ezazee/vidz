import { config } from 'dotenv'
config()
import { getSql } from '../lib/db/client'
import { generateResearch } from '../lib/ai/research'
import { generateDirector } from '../lib/ai/director'
import { generateOutline } from '../lib/ai/outline'
import { generateScenes } from '../lib/ai/scenes'
import { generateSeoMetadata } from '../lib/ai/seo'
import { generateClosingInsight } from '../lib/ai/closing'
import { pickShortSection } from '../lib/ai/pickShortSection'
import { parseCategory, buildCameraSequence, pickExcluding } from '../lib/ai/variation'
import { getChannel, type ChannelId } from '../lib/channels'

async function runPipeline() {
  const id = process.argv[2]
  if (!id) {
    console.error('Project ID is required')
    process.exit(1)
  }

  // CHANNEL_ID menentukan schema DB (getSql) DAN "kepribadian" konten (getChannel) —
  // default 'cabang-sejarah' kalau tidak di-set, backward compatible dengan pipeline lama.
  const channelId = (process.env.CHANNEL_ID || 'cabang-sejarah') as ChannelId
  const channel = getChannel(channelId)

  console.log(`[Pipeline] Starting execution for project ${id} on channel "${channel.id}"...`)
  console.log(`[Pipeline] AI_BASE_URL: ${process.env.AI_BASE_URL ?? '(not set)'}`)
  console.log(`[Pipeline] AI_MODEL: ${process.env.AI_MODEL ?? '(not set)'}`)
  console.log(`[Pipeline] AI_API_KEY: ${process.env.AI_API_KEY ? '***set***' : '(not set)'}`)
  const sql = getSql(channelId === 'cabang-sejarah' ? undefined : channelId)

  try {
    const projects = await sql`SELECT id, topic FROM projects WHERE id = ${id} LIMIT 1`
    if (!projects[0]) throw new Error('Project not found')
    const topic = projects[0].topic

    // Kategori (dari [THEME:...]) — disimpan untuk palette per-kategori & rotasi.
    const category = parseCategory(topic, channel.categories)

    // #2 Opening style: hindari gaya 3 video terakhir, paksa lewat prompt.
    const recentOpenings = await sql`
      SELECT opening_style_used FROM projects
      WHERE opening_style_used IS NOT NULL AND id != ${id}
      ORDER BY created_at DESC LIMIT 3
    `
    const openingStyle = pickExcluding(
      channel.openingStyles,
      recentOpenings.map(r => channel.openingStyles.find(o => o.id === r.opening_style_used)!).filter(Boolean),
    )

    await sql`UPDATE projects SET category = ${category}, opening_style_used = ${openingStyle.id} WHERE id = ${id}`

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
    const director = await generateDirector({ topic, research, channelId })
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
    const outline = await generateOutline(topic, research.summary, openingStyle.instruction, channelId)
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
    let globalOrderIndex = 0
    // Chapter (bukan intro/ending) = kandidat short — potongan berdiri sendiri paling masuk akal.
    const chapterCandidates: { index: number; title: string; sceneIds: string[]; narration: string }[] = []

    for (const section of outline.sections) {
      console.log(`[Pipeline] Generating scenes for section: ${section.type} - ${section.title}...`)

      const scenes = await generateScenes({
        section,
        topic,
        director,
        orderOffset: globalOrderIndex,
        fullOutline: outline.sections,
        channelId,
      })

      const sectionSceneIds: string[] = []
      const sectionNarration: string[] = []
      for (const scene of scenes) {
        scene.order_index = globalOrderIndex++
        const row = await sql`
          INSERT INTO scenes (project_id, order_index, narration, subtitle, image_prompt, pexels_query, camera, effect, emotion, transition, duration, image_status, voice_status)
          VALUES (
            ${id}, ${scene.order_index}, ${scene.narration}, ${scene.subtitle},
            ${scene.image_prompt}, ${scene.pexels_query ?? ''},
            ${scene.camera}, ${scene.effect}, ${scene.emotion},
            ${scene.transition}, ${scene.duration}, 'idle', 'idle'
          )
          RETURNING *
        `
        allScenes.push(row[0])
        sectionSceneIds.push(row[0].id)
        sectionNarration.push(row[0].narration || '')
      }

      if (section.type === 'chapter') {
        chapterCandidates.push({
          index: chapterCandidates.length,
          title: section.title,
          sceneIds: sectionSceneIds,
          narration: sectionNarration.join(' '),
        })
      }
    }
    console.log(`[Pipeline] Scenes completed. Total: ${allScenes.length} scenes.`)

    // Short/reels: AI pilih 1 chapter paling berdiri sendiri, disimpan buat trigger render
    // terpisah nanti (POST /api/projects/:id/generate {mode:'short'}) — lihat lib/ai/pickShortSection.ts.
    if (chapterCandidates.length > 0) {
      console.log('[Pipeline] Picking best chapter for short/reels...')
      const pickedIndex = await pickShortSection(topic, chapterCandidates, channelId)
      const picked = chapterCandidates.find((c) => c.index === pickedIndex) ?? chapterCandidates[0]
      await sql`UPDATE projects SET short_scene_ids = ${JSON.stringify(picked.sceneIds)}::jsonb WHERE id = ${id}`
      console.log(`[Pipeline] Short section picked: chapter ${picked.index} - "${picked.title}" (${picked.sceneIds.length} scenes).`)
    }

    // #1 Closing insight — opini/refleksi analitis, disimpan + jadi scene penutup (dibacakan).
    console.log('[Pipeline] Generating closing insight...')
    const narrationSoFar = allScenes.map(s => s.narration).filter(Boolean).join('\n\n')
    const closingInsight = await generateClosingInsight(topic, narrationSoFar, channelId)
    if (closingInsight) {
      const closingRow = await sql`
        INSERT INTO scenes (project_id, order_index, narration, subtitle, image_prompt, pexels_query, camera, effect, emotion, transition, duration, image_status, voice_status)
        VALUES (
          ${id}, ${globalOrderIndex++}, ${closingInsight}, ${closingInsight},
          ${'the narrator reflecting thoughtfully, looking directly at viewer, contemplative closing scene'}, '',
          'zoom_in', 'none', 'thinking', 'fade', 14, 'idle', 'idle'
        )
        RETURNING *
      `
      allScenes.push(closingRow[0])
    }
    await sql`UPDATE projects SET closing_insight = ${closingInsight || null} WHERE id = ${id}`

    // #4 Variasi efek visual: urutan acak, tanpa efek sama 2 scene berturut-turut.
    const cameraSeq = buildCameraSequence(allScenes.length)
    for (let i = 0; i < allScenes.length; i++) {
      await sql`UPDATE scenes SET camera = ${cameraSeq[i]} WHERE id = ${allScenes[i].id}`
    }
    await sql`UPDATE projects SET visual_effect_sequence = ${JSON.stringify(cameraSeq)}::jsonb WHERE id = ${id}`

    // 5. SEO
    console.log('[Pipeline] Running SEO...')
    const narrationText = allScenes.map(s => s.narration).filter(Boolean).join('\n\n')
    const seo = await generateSeoMetadata({
      topic,
      summary: research.summary,
      narrationText,
      channelId,
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

    // Thumbnail dibuat otomatis oleh /api/render-jobs saat render selesai (template konsisten lib/thumbnail.ts)

    await sql`UPDATE projects SET status = 'ai_completed' WHERE id = ${id}`
    console.log('[Pipeline] ✅ All AI stages completed successfully!')
    process.exit(0)
  } catch (err) {
    console.error('[Pipeline] Error:', err)
    await sql`UPDATE projects SET status = 'failed' WHERE id = ${id}`.catch(() => {})
    process.exit(1)
  }
}

runPipeline()
