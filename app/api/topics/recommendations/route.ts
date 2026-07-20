import { NextResponse } from 'next/server'
import { chat } from '@/lib/ai/client'
import { getSql } from '@/lib/db/client'
import { resolveChannelId, getChannel } from '@/lib/channels'

export async function GET(request: Request) {
  const channelId = resolveChannelId(request)
  const channel = getChannel(channelId)

  try {
    const { searchParams } = new URL(request.url)
    const theme = searchParams.get('theme') || channel.categories[0] || 'umum'

    const sql = getSql(channelId)
    // Semua topik yang pernah dipakai di channel ini — anti duplikat konten
    const recentProjects = await sql`SELECT topic FROM projects ORDER BY created_at DESC LIMIT 300`
    const usedTopics = recentProjects
      .map(p => p.topic.replace(/\s*\[THEME:.*?\]\s*/g, '').trim())
      .filter(Boolean)

    // Prompt exclusion cukup 15 terbaru (batas panjang prompt); sisanya difilter server-side
    const exclusionText = usedTopics.length > 0
      ? ` Jangan gunakan topik ini: ${usedTopics.slice(0, 15).join('; ')}.`
      : ''

    // Rekomendasi evaluasi mingguan (dari AI hari Minggu, per-channel) — prioritas topik & gaya judul
    let weeklyHint = ''
    try {
      const recRows = await sql`SELECT value FROM integrations WHERE key = 'weekly_recommendations' LIMIT 1`
      if (recRows[0]) {
        const rec = JSON.parse(recRows[0].value)
        const fresh = (Date.now() - new Date(rec.savedAt).getTime()) / 86400000 <= 8
        if (fresh) {
          const planTopics = (rec.plan ?? []).map((p: { topic: string }) => p.topic).filter(Boolean)
          const ideas = [...planTopics, ...(rec.topics ?? [])]
          if (ideas.length) weeklyHint += ` PRIORITASKAN ide dari evaluasi mingguan ini (pilih/kembangkan yang paling cocok dengan tema): ${ideas.slice(0, 8).join('; ')}.`
          if (rec.titleStyle) weeklyHint += ` Gaya judul WAJIB ikuti arahan evaluasi: ${rec.titleStyle}.`
        }
      }
    } catch { /* rekomendasi opsional — lanjut tanpa */ }

    const titleRule = channel.titlePrefix
      ? `Setiap topik WAJIB diawali "${channel.titlePrefix}", spesifik, dramatis, dan bikin penasaran.`
      : 'Setiap topik harus spesifik, dramatis, dan bikin penasaran — judul bebas, tidak perlu prefix tetap.'
    const isEn = channel.language === 'en'

    const messages = [
      {
        role: 'system' as const,
        content: isEn
          ? `${channel.prompts.narratorPersona} Reply with ONLY JSON: {"topics":["...","...","...","...","..."]}`
          : `${channel.prompts.narratorPersona} Balas HANYA JSON: {"topics":["...","...","...","...","..."]}`,
      },
      {
        role: 'user' as const,
        content: isEn
          ? `Write 5 highly clickbait, viral video topics for channel "${channel.name}" on theme: ${theme}.${exclusionText}${weeklyHint} ${titleRule}`
          : `Buat 5 topik video channel "${channel.name}" yang sangat clickbait dan viral untuk tema: ${theme}.${exclusionText}${weeklyHint} ${titleRule}`,
      },
    ]

    console.log(`Generating viral topic recommendations for ${channel.id} via AI (Fast Model)...`)
    const rawResult = await chat(messages, true)
    const result = JSON.parse(rawResult)

    // Filter server-side: buang kandidat yang mirip topik lama (AI kadang tidak nurut exclusion)
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3)
    const usedSets = usedTopics.map(t => new Set(normalize(t)))
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

    const rawTopics: string[] = result.topics || []
    const freshTopics = rawTopics.filter(t => !isDuplicate(t))

    return NextResponse.json({
      success: true,
      topics: freshTopics.length > 0 ? freshTopics : rawTopics,
      filteredOut: rawTopics.length - freshTopics.length
    })

  } catch (error) {
    console.error('Failed to generate topic recommendations:', error)
    // AI provider gagal/timeout — fallback ke pool statis milik channel ini (bukan hardcode CS)
    return NextResponse.json({
      success: true,
      topics: channel.fallbackTopics,
      isFallback: true
    })
  }
}

export const maxDuration = 300
