import { chat } from './client'
import type { OutlineSection } from './outline'
import type { DirectorOutput } from '@/lib/pipeline/types'

export interface SceneInput {
  section: OutlineSection
  topic: string
  director: Pick<DirectorOutput, 'visual_style' | 'voice_style' | 'emotion' | 'camera_style' | 'transition' | 'image_style'>
  orderOffset: number
  fullOutline?: OutlineSection[]
  previousNarration?: string[]
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

  // Hanya kirim 10 adegan terakhir untuk menghemat token konteks namun tetap menjaga kontinuitas alur cerita
  const historyContext = input.previousNarration && input.previousNarration.length > 0
    ? `Naskah Narasi Yang Sudah Ditulis Sebelumnya (JANGAN DIULANGI fakta/informasi ini, melainkan lanjutkan ceritanya secara alami):\n${input.previousNarration.slice(-10).join('\n')}`
    : 'Ini adalah awal dari naskah, belum ada adegan sebelumnya.'

  const content = await chat([
    {
      role: 'system',
      content: `Kamu adalah penulis naskah dokumenter profesional yang bertugas menulis adegan secara berurutan dan berkesinambungan. Balas HANYA JSON valid.
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

${historyContext}

Sekarang, buatlah adegan untuk bab berikut ini:
Nama Bab: "${input.section.title}" (${input.section.type})
Deskripsi Bab: ${input.section.description}

Panduan Gaya Sutradara:
- Visual style: ${input.director.visual_style}
- Voice style: ${input.director.voice_style}
- Image style: ${input.director.image_style}

Buatlah tepat ${input.section.type === 'intro' || input.section.type === 'ending' ? '6' : '8'} scene detail untuk bab ini agar cerita berkesinambungan dengan naskah sebelumnya.`,
    },
  ])
  const parsed = JSON.parse(content) as { scenes: SceneDraft[] }
  return parsed.scenes
}
