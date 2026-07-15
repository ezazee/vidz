import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'
import { resolveChannelId, getChannel } from '@/lib/channels'
import type { CameraMovement, SceneEffect, TransitionType } from '@/lib/pipeline/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

function getBackgroundMusic(genre: string, emotion: string, explicitTheme: string | null, useRealTracks = false): { url: string; volume: number; attribution?: string } {
  // Cerita Tetangga: pool per mood, gabung track musik asli royalty-free (Archive.org, CC
  // "no copyright music", izin eksplisit pemakaian komersial dengan syarat kredit) + drone
  // sintetis yang sudah ada — dipilih ACAK dari pool biar gak monoton 1 lagu terus tiap video.
  // Channel lain TIDAK disentuh (tetap logic lama di bawah, drone sintetis saja).
  if (useRealTracks) {
    const emotionLower = emotion.toLowerCase()
    const attribution = 'Music by AShamaluevMusic (soundcloud.com/ashamaluevmusic)'

    const pools: Record<'sad' | 'tense' | 'warm', { url: string; attribution?: string }[]> = {
      sad: [
        { url: 'audio/sad-piano-real.mp3', attribution },
        { url: 'audio/rain-and-tears.wav' },
      ],
      tense: [
        { url: 'audio/tense-dramatic-real.mp3', attribution },
        { url: 'audio/unsolved-mystery.wav' },
        { url: 'audio/light-in-the-darkness.wav' },
      ],
      warm: [
        { url: 'audio/warm-hopeful-real.mp3', attribution },
        { url: 'audio/warm-light.wav' },
      ],
    }

    let mood: 'sad' | 'tense' | 'warm' = 'warm'
    if (emotionLower.includes('sad') || emotionLower.includes('tragedy') || emotionLower.includes('melancholy') || emotionLower.includes('emotional')) {
      mood = 'sad'
    } else if (emotionLower.includes('tense') || emotionLower.includes('suspense') || emotionLower.includes('dark') || emotionLower.includes('mysterious')) {
      mood = 'tense'
    }

    const pool = pools[mood]
    const picked = pool[Math.floor(Math.random() * pool.length)]
    return { url: picked.url, volume: 0.12, attribution: picked.attribution }
  }

  // 1. Explicit Theme Override
  if (explicitTheme) {
    const theme = explicitTheme.toLowerCase()
    if (theme.includes('unsolved mysteries')) return { url: 'audio/unsolved-mystery.wav', volume: 0.15 }
    if (theme.includes('space & astronomy')) return { url: 'audio/light-in-the-darkness.wav', volume: 0.15 }
    if (theme.includes('what-if') || theme.includes('mythology') || theme.includes('ancient history')) return { url: 'audio/warm-light.wav', volume: 0.15 }
  }

  const genreLower = genre.toLowerCase()
  const emotionLower = emotion.toLowerCase()

  // 1. Misteri / Tense / True Crime / Ketegangan
  if (
    genreLower.includes('mystery') ||
    genreLower.includes('crime') ||
    genreLower.includes('conspiracy') ||
    emotionLower.includes('suspense') ||
    emotionLower.includes('tense') ||
    emotionLower.includes('dark') ||
    emotionLower.includes('mysterious')
  ) {
    return {
      url: 'audio/unsolved-mystery.wav', // Procedural Drone: Detuned Low D
      volume: 0.15,
    }
  }

  // 2. Sains / Ruang Angkasa / Teknologi
  if (
    genreLower.includes('science') ||
    genreLower.includes('space') ||
    genreLower.includes('tech') ||
    genreLower.includes('futuristic')
  ) {
    return {
      url: 'audio/light-in-the-darkness.wav', // Procedural Drone: Evolving High Pitch
      volume: 0.15,
    }
  }

  // 3. Tragedi / Kisah Sedih / Emosional
  if (
    emotionLower.includes('sad') ||
    emotionLower.includes('tragedy') ||
    emotionLower.includes('melancholy') ||
    emotionLower.includes('emotional')
  ) {
    return {
      url: 'audio/rain-and-tears.wav', // Procedural Drone: Brown Noise (Rain/Wind)
      volume: 0.15,
    }
  }

  // 4. Default: Sejarah / Dokumenter Klasik / Epik / Narasi Umum
  return {
    url: 'audio/warm-light.wav', // Procedural Drone: C Major chord
    volume: 0.15,
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const channelId = resolveChannelId(_request)
  const sql = getSql(channelId)
  const channel = getChannel(channelId)

  // Ambil dan simpan GITHUB_RUN_ID jika dikirimkan oleh runner
  const { searchParams } = new URL(_request.url)
  const runId = searchParams.get('run_id')
  if (runId) {
    console.log(`Linking GitHub Action run ID ${runId} to project ${id} render job...`)
    try {
      await sql`
        UPDATE render_jobs 
        SET github_run_id = ${runId}
        WHERE project_id = ${id} AND status IN ('pending', 'processing')
      `
    } catch (dbErr) {
      console.error('Failed to link GitHub run ID in database:', dbErr)
    }
  }

  const projects = await sql`
    SELECT id, topic, category, COALESCE(title, topic) AS title
    FROM projects
    WHERE id = ${id}
    LIMIT 1
  `

  if (!projects[0]) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const directors = await sql`
    SELECT *
    FROM director
    WHERE project_id = ${id}
    ORDER BY created_at DESC
    LIMIT 1
  `

  // scene_ids query param (dikirim fetch-storyboard.js untuk render short) — filter ke
  // subset scene, dipakai StoryZVideoShort. Tanpa param = perilaku lama, semua scene.
  const sceneIdsParam = searchParams.get('scene_ids')
  const sceneIdsFilter = sceneIdsParam ? sceneIdsParam.split(',').filter(Boolean) : null

  const scenes = sceneIdsFilter
    ? await sql`
        SELECT * FROM scenes
        WHERE project_id = ${id} AND id = ANY(${sceneIdsFilter})
        ORDER BY order_index ASC
      `
    : await sql`
        SELECT *
        FROM scenes
        WHERE project_id = ${id}
        ORDER BY order_index ASC
      `

  const director = directors[0]
  const genre = director?.genre ?? 'documentary'
  const emotion = director?.emotion ?? 'curious'
  
  const rawTopic = projects[0].topic || ''
  const themeMatch = rawTopic.match(/\[THEME:\s*(.*?)\]/i)
  const explicitTheme = themeMatch ? themeMatch[1] : null

  const music = getBackgroundMusic(genre, emotion, explicitTheme, channel.id === 'cerita-tetangga')
  // Simpan atribusi (kalau ada) biar publish route tau apakah caption perlu kredit musik —
  // track sintetis (drone) tidak butuh kredit, track asli (Archive.org) wajib.
  await sql`UPDATE projects SET music_attribution = ${music.attribution ?? null} WHERE id = ${id}`

  const storyboard = {
    project_id: projects[0].id,
    title: projects[0].title,
    category: projects[0].category ?? explicitTheme ?? null,
    director: {
      visual_bible: director?.visual_bible ?? {},
      character_bible: director?.character_bible ?? { characters: [] },
      environment_bible: director?.environment_bible ?? { locations: [] },
      camera_bible: director?.camera_bible ?? {},
      motion_bible: director?.motion_bible ?? {},
      thumbnail_bible: director?.thumbnail_bible ?? {},
      genre,
      visual_style: director?.visual_style ?? 'flat 2D cartoon illustration',
      emotion,
      lighting: director?.lighting ?? 'natural light',
      color_palette: director?.color_palette ?? [],
      thumbnail_style: director?.thumbnail_style ?? 'documentary',
      voice_style: director?.voice_style ?? 'calm narration',
      camera_style: director?.camera_style ?? 'slow movement',
      transition: director?.transition ?? 'fade',
      image_style: director?.image_style ?? 'flat 2D hand-drawn cartoon illustration',
    },
    scenes: scenes.map((scene) => ({
      id: scene.id,
      order_index: scene.order_index,
      duration: Number(scene.duration ?? 6),
      narration: scene.narration ?? '',
      subtitle: scene.subtitle ?? scene.narration ?? '',
      image_prompt: scene.image_prompt ?? '',
      image_url: scene.image_url ?? '',
      voice_url: scene.voice_url ?? '',
      camera: (scene.camera ?? 'static') as CameraMovement,
      effect: (scene.effect ?? 'none') as SceneEffect,
      transition: (scene.transition ?? 'fade') as TransitionType,
      emotion: scene.emotion ?? 'neutral',
      updated_at: scene.updated_at,
    })),
    audio: {
      background_music_url: music.url,
      background_music_volume: music.volume,
      background_music_attribution: music.attribution ?? null,
    },
    watermark_url: channel.watermarkAsset ?? null,
  }

  return NextResponse.json({ storyboard })
}
