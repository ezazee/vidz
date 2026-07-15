import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'
import { resolveChannelId } from '@/lib/channels'
import { z } from 'zod'

// Rencana konten mingguan dari evaluasi AI (n8n hari Minggu) — dipakai otomatis oleh
// pipeline produksi minggu berikutnya: topik per hari, jam upload per hari, gaya judul.

const planEntrySchema = z.object({
  day: z.coerce.number().min(1).max(6), // 1=Senin ... 6=Sabtu
  topic: z.string().min(5),
  theme: z.string().optional(),
  uploadTime: z.string().regex(/^([01]?\d|2[0-3])[:.]([0-5]\d)$/).optional(),
})

const saveSchema = z.object({
  plan: z.array(planEntrySchema).default([]),
  titleStyle: z.string().optional(),
  uploadTime: z.string().regex(/^([01]?\d|2[0-3])[:.]([0-5]\d)$/).optional(), // default global
})

const KEY = 'weekly_recommendations'
const MAX_AGE_DAYS = 8

const normalize = (s: string) =>
  s.toLowerCase().replace(/\s*\[theme:.*?\]\s*/gi, '').replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3)

export async function GET(request: Request) {
  const sql = getSql(resolveChannelId(request))
  try {
    const rows = await sql`SELECT value FROM integrations WHERE key = ${KEY} LIMIT 1`
    if (!rows[0]) return NextResponse.json({ recommendations: null })

    const rec = JSON.parse(rows[0].value)
    const ageDays = (Date.now() - new Date(rec.savedAt).getTime()) / 86400000
    if (ageDays > MAX_AGE_DAYS) return NextResponse.json({ recommendations: null, stale: true })

    return NextResponse.json({ recommendations: rec })
  } catch (e) {
    console.error('Failed to read weekly recommendations:', e)
    return NextResponse.json({ recommendations: null })
  }
}

export async function POST(request: Request) {
  const sql = getSql(resolveChannelId(request))
  try {
    const body = saveSchema.parse(await request.json())

    // Filter rencana: buang topik yang mirip konten lama (biar sistem tidak bikin duplikat)
    const recentProjects = await sql`SELECT topic FROM projects ORDER BY created_at DESC LIMIT 300`
    const usedSets = recentProjects.map(p => new Set(normalize(p.topic)))
    const isDuplicate = (candidate: string) => {
      const cand = new Set(normalize(candidate))
      if (cand.size === 0) return false
      return usedSets.some(used => {
        if (used.size === 0) return false
        let overlap = 0
        for (const w of cand) if (used.has(w)) overlap++
        return overlap / Math.min(cand.size, used.size) >= 0.6
      })
    }

    const cleanPlan = body.plan
      .filter(p => !isDuplicate(p.topic))
      .map(p => ({ ...p, uploadTime: p.uploadTime?.replace('.', ':') }))

    const rec = {
      plan: cleanPlan,
      titleStyle: body.titleStyle ?? null,
      uploadTime: body.uploadTime?.replace('.', ':') ?? null,
      savedAt: new Date().toISOString(),
    }
    await sql`
      INSERT INTO integrations (key, value) VALUES (${KEY}, ${JSON.stringify(rec)})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `
    return NextResponse.json({
      success: true,
      recommendations: rec,
      droppedAsDuplicate: body.plan.length - cleanPlan.length,
    })
  } catch (e) {
    console.error('Failed to save weekly recommendations:', e)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}
