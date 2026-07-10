import { chat } from './client'
import { getChannel, type ChannelId } from '@/lib/channels'

export interface OutlineSection {
  type: 'intro' | 'chapter' | 'ending'
  title: string
  order: number
  description: string
}

export interface OutlineOutput {
  sections: OutlineSection[]
}

export async function generateOutline(topic: string, summary: string, openingInstruction = '', channelId?: ChannelId): Promise<OutlineOutput> {
  const channel = getChannel(channelId)
  const isEn = channel.language === 'en'

  const openingLine = openingInstruction
    ? (isEn
        ? `\nOPENING STYLE (MUST be applied to the intro): ${openingInstruction}\n`
        : `\nGAYA PEMBUKA (WAJIB diterapkan di intro): ${openingInstruction}\n`)
    : ''

  const userPrompt = isEn
    ? `Create a viral YouTube video outline about: "${topic}"
${openingLine}
Research summary:
${summary}

Structure: ${channel.prompts.outlineStructure}

Output JSON exactly like this (5 sections: 1 intro + 3 chapter + 1 ending):
{"sections":[{"type":"intro","title":"...","order":0,"description":"..."},{"type":"chapter","title":"...","order":1,"description":"..."},{"type":"chapter","title":"...","order":2,"description":"..."},{"type":"chapter","title":"...","order":3,"description":"..."},{"type":"ending","title":"...","order":4,"description":"..."}]}

Titles must be provocative with specific numbers/names. Start output with { and nothing else.`
    : `Buat outline video YouTube viral tentang: "${topic}"
${openingLine}
Ringkasan riset:
${summary}

Struktur: ${channel.prompts.outlineStructure}

WAJIB output JSON persis seperti ini (5 sections: 1 intro + 3 chapter + 1 ending):
{"sections":[{"type":"intro","title":"...","order":0,"description":"..."},{"type":"chapter","title":"...","order":1,"description":"..."},{"type":"chapter","title":"...","order":2,"description":"..."},{"type":"chapter","title":"...","order":3,"description":"..."},{"type":"ending","title":"...","order":4,"description":"..."}]}

Judul harus provokatif dengan angka/nama spesifik. Mulai output dengan karakter { dan tidak ada teks lain.`

  const content = await chat([
    {
      role: 'system',
      content: `${channel.prompts.narratorPersona} Output ONLY raw JSON, no other text, no markdown, no explanation.`,
    },
    { role: 'user', content: userPrompt },
  ], true)
  try {
    let cleaned = content.trim()
    // 1. Hapus pembungkus markdown
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim()
    
    // 2. Ambil hanya bagian JSON yang valid (antara kurung kurawal pertama dan terakhir)
    const startCurly = cleaned.indexOf('{')
    const endCurly = cleaned.lastIndexOf('}')
    if (startCurly !== -1 && endCurly !== -1 && endCurly > startCurly) {
      cleaned = cleaned.substring(startCurly, endCurly + 1)
    }
    
    // 3. Bersihkan trailing commas
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1')

    return JSON.parse(cleaned) as OutlineOutput
  } catch (err) {
    console.error('Gagal mem-parse outline JSON. Konten asli:', content)
    throw new Error(`Format JSON Outline dari AI tidak valid: ${(err as Error).message}`)
  }
}
