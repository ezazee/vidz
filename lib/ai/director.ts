import { chat } from './client'
import type { DirectorOutput } from '@/lib/pipeline/types'
import type { ResearchOutput } from '@/lib/ai/research'

export interface DirectorInput {
  topic: string
  research: ResearchOutput
}

export async function generateDirector(input: DirectorInput): Promise<DirectorOutput> {
  const content = await chat([
    {
      role: 'system',
      content: `Kamu adalah sutradara dokumenter profesional. Balas HANYA dengan JSON valid tanpa markdown.
Schema yang harus dikembalikan:
{
  "genre": string,
  "visual_style": string,
  "emotion": string,
  "lighting": string,
  "color_palette": string[],
  "thumbnail_style": string,
  "voice_style": string,
  "camera_style": string,
  "transition": "cut"|"fade"|"dissolve"|"wipe",
  "image_style": string,
  "visual_bible": { "genre": string, "visual_style": string, "image_style": string, "color_palette": string[], "lighting": string, "emotion": string, "transition": string },
  "character_bible": { "characters": [{ "name": string, "description": string, "clothing": string, "prompt_anchor": string }] },
  "environment_bible": { "locations": [{ "name": string, "description": string, "prompt_anchor": string }], "era": string, "geography": string },
  "camera_bible": { "default_movement": string, "allowed_movements": string[], "aspect_ratio": "16:9", "composition_rules": string },
  "motion_bible": { "transition_style": string, "effect_palette": string[], "timing": string },
  "thumbnail_bible": { "style": string, "color_scheme": string, "text_style": string, "composition": string }
}`,
    },
    {
      role: 'user',
      content: `Topik: "${input.topic}"

Ringkasan riset:
${input.research.summary}

Fakta kunci:
${input.research.facts.slice(0, 5).join('\n')}

Buat director bible lengkap untuk video dokumenter YouTube tentang topik ini. Gunakan bahasa Indonesia untuk voice_style.`,
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

    return JSON.parse(cleaned) as DirectorOutput
  } catch (err) {
    console.error('Gagal mem-parse director JSON. Konten asli:', content)
    throw new Error(`Format JSON Director dari AI tidak valid: ${(err as Error).message}`)
  }
}
