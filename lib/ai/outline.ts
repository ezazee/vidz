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
      content: `Kamu adalah Master Storyteller & Pakar Hook YouTube. Balas HANYA JSON valid.
Schema: { "sections": [{ "type": "intro"|"chapter"|"ending", "title": string, "order": number, "description": string }] }
- 1 intro, 3 chapter, 1 ending (TEPAT 5 sections total, tidak boleh lebih!)
- SANGAT PENTING: Jangan buat outline yang generik atau membosankan!
- Intro WAJIB berisi "Curiosity Hook" yang memancing rasa penasaran ekstrem atau ancaman besar.
- Chapter WAJIB membangun ketegangan (Tension Building), klimaks, dan pengungkapan fakta gila.
- Setiap bab harus fokus pada kronologi/aspek yang spesifik dan provokatif (target akhir video 8-10 menit).`,
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
