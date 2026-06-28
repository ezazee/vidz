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
      content: `Kamu adalah showrunner dokumenter Netflix & Vice. Output HANYA JSON mentah, tanpa teks lain, tanpa markdown, tanpa penjelasan.`,
    },
    {
      role: 'user',
      content: `Buat outline dokumenter YouTube viral tentang: "${topic}"

Ringkasan riset:
${summary}

WAJIB output JSON persis seperti ini (5 sections: 1 intro + 3 chapter + 1 ending):
{"sections":[{"type":"intro","title":"...momen paling dramatis...","order":0,"description":"..."},{"type":"chapter","title":"...fakta mengejutkan...","order":1,"description":"..."},{"type":"chapter","title":"...plot twist/keputusan kritis...","order":2,"description":"..."},{"type":"chapter","title":"...konsekuensi & pengungkapan...","order":3,"description":"..."},{"type":"ending","title":"...pertanyaan terbuka atau fakta terakhir yang bikin share...","order":4,"description":"..."}]}

Judul harus provokatif dengan angka/nama spesifik. Mulai output dengan karakter { dan tidak ada teks lain.`,
    },
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
