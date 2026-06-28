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
      content: `Kamu adalah sutradara dokumenter profesional. Output HANYA JSON mentah, tanpa teks lain.`,
    },
    {
      role: 'user',
      content: `Topik: "${input.topic}"
Ringkasan: ${input.research.summary.slice(0, 300)}
Fakta: ${input.research.facts.slice(0, 3).join(' | ')}

Output JSON director bible, mulai dengan { :
{"genre":"...","visual_style":"...","emotion":"...","lighting":"...","color_palette":["..."],"thumbnail_style":"...","voice_style":"narasi bahasa Indonesia dramatis","camera_style":"...","transition":"fade","image_style":"cinematic documentary photorealistic","visual_bible":{"genre":"...","visual_style":"...","image_style":"...","color_palette":["..."],"lighting":"...","emotion":"...","transition":"fade"},"character_bible":{"characters":[{"name":"...","description":"...","clothing":"...","prompt_anchor":"..."}]},"environment_bible":{"locations":[{"name":"...","description":"...","prompt_anchor":"..."}],"era":"...","geography":"..."},"camera_bible":{"default_movement":"pan_right","allowed_movements":["static","pan_left","pan_right","zoom_in"],"aspect_ratio":"16:9","composition_rules":"rule of thirds"},"motion_bible":{"transition_style":"cinematic dissolve","effect_palette":["light_rays","fog"],"timing":"slow"},"thumbnail_bible":{"style":"dramatic","color_scheme":"dark gold","text_style":"bold impact","composition":"..."}}`,
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
