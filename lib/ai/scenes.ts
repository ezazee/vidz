import { chat } from './client'
import type { OutlineSection } from './outline'
import type { DirectorOutput } from '@/lib/pipeline/types'

export interface SceneInput {
  section: OutlineSection
  topic: string
  director: Pick<DirectorOutput, 'visual_style' | 'voice_style' | 'emotion' | 'camera_style' | 'transition' | 'image_style'>
  orderOffset: number
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
  const content = await chat([
    {
      role: 'system',
      content: `Kamu adalah penulis naskah dokumenter. Balas HANYA JSON valid.
Schema: { "scenes": [{ "order_index": number, "narration": string, "subtitle": string, "image_prompt": string, "camera": "static"|"pan_left"|"pan_right"|"zoom_in"|"zoom_out"|"tilt_up"|"tilt_down", "effect": "none"|"light_rays"|"fog"|"dust", "emotion": string, "transition": "cut"|"fade"|"dissolve"|"wipe", "duration": number }] }
- 3-5 scene per section
- narration: narasi panjang untuk voiceover (2-4 kalimat)
- subtitle: versi pendek narration (max 10 kata)
- image_prompt: prompt bahasa Inggris detail untuk image AI, sesuai visual_style
- duration: 5-8 detik per scene
- order_index mulai dari ${input.orderOffset}`,
    },
    {
      role: 'user',
      content: `Topik: "${input.topic}"
Section: "${input.section.title}" (${input.section.type})
Deskripsi: ${input.section.description}
Visual style: ${input.director.visual_style}
Voice style: ${input.director.voice_style}
Image style: ${input.director.image_style}

Buat ${input.section.type === 'intro' || input.section.type === 'ending' ? '3' : '4'} scene untuk section ini.`,
    },
  ])
  const parsed = JSON.parse(content) as { scenes: SceneDraft[] }
  return parsed.scenes
}
