import { NextResponse } from 'next/server'
import { chat } from '@/lib/ai/client'
import { getSql } from '@/lib/db/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const theme = searchParams.get('theme') || 'umum'

    const sql = getSql()
    // Fetch last 20 projects to avoid repeating recent topics
    const recentProjects = await sql`SELECT topic FROM projects ORDER BY created_at DESC LIMIT 5`
    const usedTopics = recentProjects
      .map(p => p.topic.replace(/\s*\[THEME:.*?\]\s*/g, '').trim())
      .filter(Boolean)

    const exclusionText = usedTopics.length > 0
      ? ` Jangan gunakan topik ini: ${usedTopics.join('; ')}.`
      : ''

    const messages = [
      {
        role: 'system' as const,
        content: `Kamu strategi konten channel YouTube "Cabang Sejarah" (video what-if sejarah alternatif). Balas HANYA JSON: {"topics":["...","...","...","...","..."]}`
      },
      {
        role: 'user' as const,
        content: `Buat 5 topik video "Bagaimana Jika..." bahasa Indonesia yang sangat clickbait dan viral untuk tema: ${theme}.${exclusionText} Setiap topik WAJIB diawali "Bagaimana Jika", spesifik, dramatis, dan bikin penasaran.`
      }
    ]

    console.log('Generating viral topic recommendations via AI (Fast Model)...')
    const rawResult = await chat(messages, true)
    const result = JSON.parse(rawResult)

    return NextResponse.json({
      success: true,
      topics: result.topics || []
    })

  } catch (error) {
    console.error('Failed to generate topic recommendations:', error)
    // Fallback topics in case the AI provider fails or times out
    const fallbackTopics = [
      "Bagaimana Jika Indonesia Tidak Pernah Dijajah Belanda?",
      "Bagaimana Jika Majapahit Tidak Pernah Runtuh?",
      "Bagaimana Jika Gunung Krakatau Tidak Meletus Tahun 1883?",
      "Bagaimana Jika Jepang Menang Perang Dunia II?",
      "Bagaimana Jika Internet Ditemukan 100 Tahun Lebih Awal?"
    ]
    return NextResponse.json({
      success: true,
      topics: fallbackTopics,
      isFallback: true
    })
  }
}
