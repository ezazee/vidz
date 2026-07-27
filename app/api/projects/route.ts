import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSql } from '@/lib/db/client'
import { resolveChannelId, getChannel, type ChannelId } from '@/lib/channels'

const ALL_CHANNELS: ChannelId[] = ['cabang-sejarah', 'brainwhy', 'cerita-tetangga']

const createProjectSchema = z.object({
  topic: z.string().min(3),
  user_id: z.string().uuid().optional(),
})

/** Buang tag [THEME:...] lalu normalisasi untuk cek duplikat (case-insensitive). */
function normalizeTopic(topic: string): string {
  return topic.replace(/\s*\[THEME:.*?\]\s*/gi, '').trim().toLowerCase()
}

/**
 * Variasikan judul topik agar unik: "Topik" → "Topik (1)" → "Topik (2)" …
 * Dipakai saat topik sudah pernah dibuat, supaya workflow n8n (BrainWhy & Cerita
 * Tetangga) tidak kena HTTP 409 dan pipeline tetap jalan.
 */
function varyTopic(baseTopic: string, attempt: number): string {
  // Ambil base tanpa suffix (N) yang mungkin sudah ada, supaya tidak jadi "Topik (1) (2)"
  const base = baseTopic.replace(/\s*\(\d+\)\s*$/, '').trim()
  // Pertahankan tag [THEME:...] di akhir jika ada di original
  const themeMatch = baseTopic.match(/(\s*\[THEME:.*?\]\s*)$/i)
  const theme = themeMatch ? themeMatch[1] : ''
  const core = base.replace(/(\s*\[THEME:.*?\]\s*)$/i, '').trim()
  return `${core} (${attempt})${theme}`
}

export async function POST(request: Request) {
  const body = createProjectSchema.parse(await request.json())
  const sql = getSql(resolveChannelId(request))

  // Guard anti-duplikat: variasikan judul otomatis jika topik sudah ada
  // (bukan langsung 409 — agar workflow BrainWhy & Cerita Tetangga tidak macet)
  let topicToInsert = body.topic
  const MAX_ATTEMPTS = 10

  for (let attempt = 0; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      topicToInsert = varyTopic(body.topic, attempt)
    }

    const normalized = normalizeTopic(topicToInsert)
    const dup = await sql`
      SELECT id FROM projects
      WHERE lower(trim(regexp_replace(topic, '\\s*\\[THEME:.*?\\]\\s*', '', 'gi'))) = ${normalized}
      LIMIT 1
    `

    if (!dup[0]) {
      // Topik unik — lanjut insert
      break
    }

    if (attempt === MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Gagal membuat topik unik setelah beberapa percobaan' },
        { status: 409 },
      )
    }
  }

  const rows = await sql`
    INSERT INTO projects (user_id, topic)
    VALUES (${body.user_id ?? '00000000-0000-0000-0000-000000000000'}, ${topicToInsert})
    RETURNING id, topic, status, created_at
  `

  return NextResponse.json(
    {
      project: rows[0],
      // Flag supaya caller (n8n / studio) tahu judul diubah karena duplikat
      topicVaried: topicToInsert !== body.topic,
      originalTopic: body.topic,
    },
    { status: 201 },
  )
}

// Query dasar yang sama, dipakai per-channel lalu digabung — 1 schema = 1 query, hasilnya
// ditandai channel/channelName/platform biar UI bisa filter & kasih badge yang benar.
async function fetchProjectsForChannel(channelId: ChannelId) {
  const sql = getSql(channelId === 'cabang-sejarah' ? undefined : channelId)
  const channel = getChannel(channelId)
  const rows = await sql`
    SELECT
      p.id,
      p.topic,
      p.status as project_status,
      p.created_at,
      rj.status as render_status,
      rj.video_url,
      rj.error,
      COALESCE(t.image_url, s.image_url) as thumbnail_url
    FROM projects p
    LEFT JOIN LATERAL (
      SELECT status, video_url, error
      FROM render_jobs
      WHERE project_id = p.id
      ORDER BY created_at DESC
      LIMIT 1
    ) rj ON true
    LEFT JOIN LATERAL (
      SELECT image_url
      FROM thumbnails
      WHERE project_id = p.id
      ORDER BY created_at DESC
      LIMIT 1
    ) t ON true
    LEFT JOIN LATERAL (
      SELECT image_url
      FROM scenes
      WHERE project_id = p.id AND image_url IS NOT NULL AND image_url != ''
      ORDER BY order_index ASC
      LIMIT 1
    ) s ON true
    ORDER BY p.created_at DESC
  `
  return rows.map((r: any) => ({
    ...r,
    channel: channelId,
    channelName: channel.name,
    platform: channel.publishPlatform ?? 'youtube',
  }))
}

// Tanpa x-channel-id/?channel= = gabung SEMUA channel (dipakai Library "lihat semua project").
// Dengan header/query channel spesifik = perilaku lama, cuma channel itu (backward compatible).
export async function GET(request: Request) {
  const requestedChannel = resolveChannelId(request)

  try {
    if (requestedChannel) {
      const projects = await fetchProjectsForChannel(requestedChannel)
      return NextResponse.json({ projects })
    }

    const results = await Promise.all(ALL_CHANNELS.map((c) => fetchProjectsForChannel(c)))
    const projects = results.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}
