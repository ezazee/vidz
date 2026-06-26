import { chat } from './client'

export interface OutlineSection {
  type: 'intro' | 'chapter' | 'ending'
  title: string
  order: number
  description: string
}

export interface OutlineOutput {
  sections: OutlineSection[]
}

export async function generateOutline(topic: string, summary: string): Promise<OutlineOutput> {
  const content = await chat([
    {
      role: 'system',
      content: `Kamu adalah penulis dokumenter. Balas HANYA JSON valid.
Schema: { "sections": [{ "type": "intro"|"chapter"|"ending", "title": string, "order": number, "description": string }] }
- 1 intro, 4-6 chapter, 1 ending
- Setiap chapter fokus pada satu aspek/periode sejarah/kronologi kejadian yang sangat spesifik untuk mendukung durasi video panjang (target akhir video 10-15 menit).`,
    },
    {
      role: 'user',
      content: `Buat outline video dokumenter YouTube tentang: "${topic}"\n\nRingkasan:\n${summary}`,
    },
  ])
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
