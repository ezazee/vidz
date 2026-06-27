import { chat } from './client'
import type { OutlineSection } from './outline'
import type { DirectorOutput } from '@/lib/pipeline/types'

export interface SceneInput {
  section: OutlineSection
  topic: string
  director: Pick<DirectorOutput, 'visual_style' | 'voice_style' | 'emotion' | 'camera_style' | 'transition' | 'image_style'>
  orderOffset: number
  fullOutline?: OutlineSection[]
}

export interface SceneDraft {
  order_index: number
  narration: string
  subtitle: string
  image_prompt: string
  camera: string
  effect: string
  emotion: string
  transition: string
  duration: number
}

export async function generateScenes(input: SceneInput): Promise<SceneDraft[]> {
  const outlineContext = input.fullOutline
    ? `Struktur Lengkap Outline Video:\n${input.fullOutline.map(s => `- [${s.type}] ${s.title}: ${s.description}`).join('\n')}`
    : ''

  const numScenes = input.section.type === 'intro' || input.section.type === 'ending' ? 6 : 8

  const content = await chat([
    {
      role: 'system',
      content: `Kamu adalah penulis naskah dokumenter profesional kelas dunia. Balas HANYA JSON valid.
Schema: { "scenes": [{ "order_index": number, "narration": string, "subtitle": string, "image_prompt": string, "pexels_query": string, "camera": "static"|"pan_left"|"pan_right"|"zoom_in"|"zoom_out"|"tilt_up"|"tilt_down", "effect": "none"|"light_rays"|"fog"|"dust", "emotion": string, "transition": "cut"|"fade"|"dissolve"|"wipe", "duration": number }] }
- narration: SANGAT KRITIKAL! Tulis narasi yang *visceral*, emosional, dan penuh ketegangan. WAJIB PENDEK DAN PADAT (Maksimal 20-35 kata, sekitar 1-2 kalimat per scene). Durasi baca TTS harus tepat 12-15 detik! JANGAN PERNAH gunakan kalimat klise/generik. Gunakan teknik "Show, Don't Tell". Langsung tembak dengan fakta gila! Gunakan bahasa Indonesia baku namun dramatis seperti dokumenter Netflix.
- subtitle: versi pendek narration (max 10 kata)
- image_prompt: prompt bahasa Inggris detail untuk image AI, sesuai visual_style. Jelaskan objek, komposisi, pencahayaan, dan detail visual secara spesifik.
- pexels_query: SANGAT KRITIKAL! Ini digunakan untuk mencari video stok (video dunia nyata dari Pexels).
  - ISI dengan 1-2 kata benda bahasa Inggris HANYA JIKA adegan adalah suasana umum/B-Roll yang pasti tersedia di stok video (contoh: "ocean", "forest", "city night", "sad person", "galaxy", "rain", "crowd").
  - WAJIB KOSONGKAN ("") JIKA adegan membutuhkan hal spesifik yang tidak mungkin ada di stok video: tokoh sejarah, makhluk mitologi, hewan spesifik bertarung, monster, senjata kuno, adegan perang detail, wajah karakter fiksi, atau objek sangat unik. Jika dikosongkan, sistem akan menggambarnya menggunakan AI Image Generator agar 100% akurat dan sesuai topik.
- duration: 12-18 detik per scene (sesuai panjang narasi yang dibacakan, target total video 8-10 menit)
- order_index mulai dari ${input.orderOffset}`,
    },
    {
      role: 'user',
      content: `Topik utama video: "${input.topic}"

${outlineContext}

Tugas Anda:
Buatlah adegan untuk bab berikut ini secara spesifik:
Nama Bab: "${input.section.title}" (${input.section.type})
Deskripsi Bab: ${input.section.description}

PENTING UNTUK KONSISTENSI & MENCEGAH PENGULANGAN:
- Harap fokus HANYA pada deskripsi bab ini. JANGAN mengambil fakta, penjelasan, atau materi yang tertulis pada deskripsi bab lain di outline.
- Tulis narasi yang menyambung secara logis dengan struktur outline keseluruhan, namun mandiri dan tidak tumpang tindih dengan bab lainnya.

Panduan Gaya Sutradara:
- Visual style: ${input.director.visual_style}
- Voice style: ${input.director.voice_style}
- Image style: ${input.director.image_style}

INSTRUKSI FINAL & KRITIKAL:
Bab ini membutuhkan TEPAT ${numScenes} scene. Kamu WAJIB mengembalikan array "scenes" yang berisi persis ${numScenes} objek. Jangan kurang, jangan lebih!
Jika materi/deskripsi terasa sedikit, JANGAN mengurangi jumlah scene! Jabarkan lebih detail secara perlahan (slow pacing) dengan mendeskripsikan visual, suasana, dan emosi yang mendalam agar jumlah scene tetap persis ${numScenes}.`,
    },
  ], true, 'gemini-flash-grade')
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

    const parsed = JSON.parse(cleaned) as { scenes: SceneDraft[] }
    return parsed.scenes
  } catch (err) {
    console.error('Gagal mem-parse scenes JSON. Konten asli:', content)
    throw new Error(`Format JSON Adegan dari AI tidak valid: ${(err as Error).message}`)
  }
}
