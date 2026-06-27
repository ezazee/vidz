import { NextResponse } from 'next/server'
import { chat } from '@/lib/ai/client'
import { getSql } from '@/lib/db/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const theme = searchParams.get('theme') || 'umum'

    const sql = getSql()
    // Fetch last 20 projects to avoid repeating recent topics
    const recentProjects = await sql`SELECT topic FROM projects ORDER BY created_at DESC LIMIT 20`
    const usedTopics = recentProjects
      .map(p => p.topic.replace(/\s*\[THEME:.*?\]\s*/g, '').trim())
      .filter(Boolean)

    let exclusionText = ''
    if (usedTopics.length > 0) {
      exclusionText = `\nCRITICAL: DO NOT suggest any of the following topics, as they have already been covered:\n- ${usedTopics.join('\n- ')}`
    }

    const systemPrompt = `You are a YouTube viral content strategist. Suggest exactly 5 highly engaging, clickbait, and educational video topics in Indonesian suitable for historical, scientific, mystery, or biographical documentary/explainer videos. 
    The requested visual theme / genre is: "${theme}". You MUST tailor the topics to fit this theme!${exclusionText}
    You MUST return a JSON object containing a "topics" field which is a string array of exactly 5 topics. 
    Example output format:
    {
      "topics": [
        "Detik-detik Meletusnya Gunung Krakatau 1883",
        "Misteri Hilangnya Peradaban Atlantis",
        "Gajah Mada: Sumpah Palapa dan Penyatuan Nusantara",
        "Bagaimana Jika Bumi Berhenti Berputar?",
        "Konspirasi Area 51 dan Pendaratan di Bulan"
      ]
    }`

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `Hasilkan 5 rekomendasi topik video YouTube yang sangat clickbait dan edukatif, khusus untuk tema: ${theme}.` }
    ]

    console.log('Generating viral topic recommendations via AI (Fast Model)...')
    const rawResult = await chat(messages, true, 'gemini-flash-grade')
    const result = JSON.parse(rawResult)

    return NextResponse.json({
      success: true,
      topics: result.topics || []
    })

  } catch (error) {
    console.error('Failed to generate topic recommendations:', error)
    // Fallback topics in case the AI provider fails or times out
    const fallbackTopics = [
      "Detik-detik Meletusnya Gunung Krakatau 1883",
      "Misteri Hilangnya Peradaban Atlantis",
      "Gajah Mada: Sumpah Palapa dan Penyatuan Nusantara",
      "Bagaimana Jika Bumi Berhenti Berputar?",
      "Konspirasi Area 51 dan Pendaratan di Bulan"
    ]
    return NextResponse.json({
      success: true,
      topics: fallbackTopics,
      isFallback: true
    })
  }
}
