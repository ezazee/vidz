import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'
import type { CameraMovement, SceneEffect, TransitionType } from '@/lib/pipeline/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

function getBackgroundMusic(genre: string, emotion: string): { url: string; volume: number } {
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
      url: 'https://www.chosic.com/wp-content/uploads/2020/06/Unsolved-Mystery.mp3', // Unsolved Mystery - Tense & Dark
      volume: 0.10,
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
      url: 'https://www.chosic.com/wp-content/uploads/2021/05/Light-In-The-Darkness.mp3', // Light in the Darkness - Ambient Synth
      volume: 0.12,
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
      url: 'https://www.chosic.com/wp-content/uploads/2021/07/Rain-and-Tears-Sad-Piano-Music.mp3', // Sad Piano
      volume: 0.12,
    }
  }

  // 4. Default: Sejarah / Dokumenter Klasik / Epik / Narasi Umum
  return {
    url: 'https://www.chosic.com/wp-content/uploads/2021/09/Warm-Light.mp3', // Warm Light - Beautiful Cinematic Orchestral
    volume: 0.12,
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const sql = getSql()

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
    SELECT id, COALESCE(title, topic) AS title
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

  const scenes = await sql`
    SELECT *
    FROM scenes
    WHERE project_id = ${id}
    ORDER BY order_index ASC
  `

  const director = directors[0]
  const genre = director?.genre ?? 'documentary'
  const emotion = director?.emotion ?? 'curious'
  const music = getBackgroundMusic(genre, emotion)

  const storyboard = {
    project_id: projects[0].id,
    title: projects[0].title,
    director: {
      visual_bible: director?.visual_bible ?? {},
      character_bible: director?.character_bible ?? { characters: [] },
      environment_bible: director?.environment_bible ?? { locations: [] },
      camera_bible: director?.camera_bible ?? {},
      motion_bible: director?.motion_bible ?? {},
      thumbnail_bible: director?.thumbnail_bible ?? {},
      genre,
      visual_style: director?.visual_style ?? 'cinematic documentary',
      emotion,
      lighting: director?.lighting ?? 'natural light',
      color_palette: director?.color_palette ?? [],
      thumbnail_style: director?.thumbnail_style ?? 'documentary',
      voice_style: director?.voice_style ?? 'calm narration',
      camera_style: director?.camera_style ?? 'slow movement',
      transition: director?.transition ?? 'fade',
      image_style: director?.image_style ?? 'photorealistic',
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
    })),
    audio: {
      background_music_url: music.url,
      background_music_volume: music.volume,
    },
  }

  return NextResponse.json({ storyboard })
}
