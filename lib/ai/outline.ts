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
      content: `Kamu adalah showrunner dokumenter Netflix & Vice kelas dunia. Balas HANYA JSON valid.
Schema: { "sections": [{ "type": "intro"|"chapter"|"ending", "title": string, "order": number, "description": string }] }
WAJIB 1 intro + 3 chapter + 1 ending = TEPAT 5 sections.

FORMULA VIRAL YOUTUBE DOCUMENTARY:
- INTRO: Mulai IN MEDIAS RES — lempar penonton ke momen paling dramatis/mengejutkan. Ajukan pertanyaan yang tidak bisa diabaikan. Buat penonton merasa: "Tunggu, apa ini??"
- CHAPTER 1: Latar belakang yang bikin syok — fakta yang bertentangan dengan asumsi umum
- CHAPTER 2: Titik puncak ketegangan — momen di mana segalanya berubah, keputusan kritis, plot twist
- CHAPTER 3: Konsekuensi & pengungkapan — "siapa yang tahu", "apa yang disembunyikan", dampak nyata
- ENDING: Bukan penutup generik! Tinggalkan pertanyaan terbuka atau fakta mengejutkan terakhir yang bikin penonton share video

JUDUL setiap chapter WAJIB:
- Spesifik dan provokatif (pakai angka, nama, atau pernyataan mengejutkan)
- Contoh BAIK: "48 Jam Sebelum Kehancuran: Keputusan yang Mengubah Segalanya"
- Contoh BURUK: "Latar Belakang Kejadian"`,
    },
    {
      role: 'user',
      content: `Buat outline dokumenter YouTube yang SANGAT menarik tentang: "${topic}"

Ringkasan riset:
${summary}

INGAT: Ini bukan essay sekolah. Ini dokumenter yang harus membuat orang tidak bisa berhenti menonton dari detik pertama sampai akhir.`,
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
