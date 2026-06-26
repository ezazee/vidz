import { NextResponse } from 'next/server'
import { chat } from '@/lib/ai/client'

export async function GET() {
  try {
    const systemPrompt = `You are a YouTube viral content strategist. Suggest exactly 5 highly engaging, clickbait, and educational video topics in Indonesian suitable for historical, scientific, mystery, or biographical documentary/explainer videos. 
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
      { role: 'user' as const, content: 'Hasilkan 5 rekomendasi topik video YouTube yang sangat clickbait dan edukatif tentang sejarah, sains, atau misteri.' }
    ]

    console.log('Generating viral topic recommendations via AI...')
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
