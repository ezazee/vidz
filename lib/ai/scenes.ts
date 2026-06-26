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

function repairJson(json: string): string {
  let repaired = json.trim()

  // 1. Perbaiki objek adegan yang tidak ditutup dengan } sebelum koma: , { -> }, {
  repaired = repaired.replace(/([^}\]\s])\s*,\s*\{/g, '$1},\n{')

  // 2. Perbaiki koma yang hilang di antara objek adegan: } { -> }, {
  repaired = repaired.replace(/}\s*\{/g, '},\n{')

  // 3. Bersihkan koma menggantung (trailing commas) sebelum penutup bracket/brace
  repaired = repaired.replace(/,\s*([\]}])/g, '$1')

  return repaired
}

export async function generateScenes(input: SceneInput): Promise<SceneDraft[]> {
  const outlineContext = input.fullOutline
    ? `Struktur Lengkap Outline Video:\n${input.fullOutline.map(s => `- [${s.type}] ${s.title}: ${s.description}`).join('\n')}`
    : ''

  const content = await chat([
    {
      role: 'system',
      content: `Kamu adalah penulis naskah dokumenter profesional. Balas HANYA JSON valid.
Schema: { "scenes": [{ "order_index": number, "narration": string, "subtitle": string, "image_prompt": string, "camera": "static"|"pan_left"|"pan_right"|"zoom_in"|"zoom_out"|"tilt_up"|"tilt_down", "effect": "none"|"light_rays"|"fog"|"dust", "emotion": string, "transition": "cut"|"fade"|"dissolve"|"wipe", "duration": number }] }
- 6-8 scene per section
- narration: narasi panjang, mendalam, dan kaya informasi untuk voiceover (3-5 kalimat detail). Gunakan bahasa Indonesia yang baku, dramatis, dan mengalir seperti dokumenter profesional.
- subtitle: versi pendek narration (max 10 kata)
- image_prompt: prompt bahasa Inggris detail untuk image AI, sesuai visual_style. Jelaskan objek, komposisi, pencahayaan, dan detail visual secara spesifik.
- duration: 8-10 detik per scene (sesuai panjang narasi yang dibacakan)
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

Buatlah tepat ${input.section.type === 'intro' || input.section.type === 'ending' ? '6' : '8'} scene detail untuk bab ini.`,
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
    
    // 3. Bersihkan dan perbaiki kesalahan struktur JSON dari AI
    cleaned = repairJson(cleaned)

    const parsed = JSON.parse(cleaned) as { scenes: SceneDraft[] }
    return parsed.scenes
  } catch (err) {
    console.error('Gagal mem-parse scenes JSON. Konten asli:', content)
    throw new Error(`Format JSON Adegan dari AI tidak valid: ${(err as Error).message}`)
  }
}
