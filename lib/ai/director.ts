import { chat } from './client'
import type { DirectorOutput } from '@/lib/pipeline/types'
import type { ResearchOutput } from '@/lib/ai/research'

export interface DirectorInput {
  topic: string
  research: ResearchOutput
}

// Karakter maskot tetap channel "Cabang Sejarah" — anchor di-hardcode (bukan dari AI)
// supaya deskripsi visualnya identik di SETIAP scene & SETIAP video.
export const MASCOT_ANCHOR =
  'a simple minimalist stick figure character with pure white round head, plain white body, ' +
  'two small black dot eyes, no mouth, thin clean black outline'

export const CARTOON_STYLE =
  'flat 2D hand-drawn cartoon illustration, storybook comic style, warm muted colors, ' +
  'clean thick outlines, simple shapes, detailed illustrated background'

export async function generateDirector(input: DirectorInput): Promise<DirectorOutput> {
  const content = await chat([
    {
      role: 'system',
      content: `Kamu adalah sutradara video animasi ilustrasi 2D. Output HANYA JSON mentah, tanpa teks lain.`,
    },
    {
      role: 'user',
      content: `Topik: "${input.topic}"
Ringkasan: ${input.research.summary.slice(0, 300)}
Fakta: ${input.research.facts.slice(0, 3).join(' | ')}

Gaya video: ilustrasi kartun flat 2D dengan satu karakter stick figure sebagai pemandu cerita.
Tentukan kostum/aksesoris karakter yang sesuai era & topik (misal: helm perang, blangkon, jas lab).

Output JSON director bible, mulai dengan { :
{"genre":"...","visual_style":"flat 2D cartoon illustration","emotion":"...","lighting":"...","color_palette":["..."],"thumbnail_style":"...","voice_style":"narasi bahasa Indonesia dramatis","camera_style":"...","transition":"fade","image_style":"flat 2D hand-drawn cartoon illustration","visual_bible":{"genre":"...","visual_style":"...","image_style":"...","color_palette":["..."],"lighting":"...","emotion":"...","transition":"fade"},"character_bible":{"characters":[{"name":"Si Cabang","description":"stick figure pemandu cerita","clothing":"kostum sesuai era topik, jelaskan spesifik dalam bahasa Inggris","prompt_anchor":"wearing [kostum bahasa Inggris singkat]"}]},"environment_bible":{"locations":[{"name":"...","description":"...","prompt_anchor":"..."}],"era":"...","geography":"..."},"camera_bible":{"default_movement":"pan_right","allowed_movements":["static","pan_left","pan_right","zoom_in"],"aspect_ratio":"16:9","composition_rules":"rule of thirds"},"motion_bible":{"transition_style":"soft dissolve","effect_palette":[],"timing":"medium"},"thumbnail_bible":{"style":"cartoon illustration","color_scheme":"warm bright","text_style":"bold impact","composition":"..."}}`,
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

    const director = JSON.parse(cleaned) as DirectorOutput

    // Paksa konsistensi: style & anchor maskot tidak boleh diubah AI.
    // AI hanya menyumbang kostum kontekstual (clothing/prompt_anchor per topik).
    director.image_style = CARTOON_STYLE
    director.visual_style = 'flat 2D cartoon illustration'
    const aiChar = director.character_bible?.characters?.[0]
    director.character_bible = {
      characters: [{
        name: 'Si Cabang',
        description: 'Stick figure putih polos, maskot pemandu cerita Cabang Sejarah',
        clothing: aiChar?.clothing ?? '',
        prompt_anchor: `${MASCOT_ANCHOR}${aiChar?.prompt_anchor ? ', ' + aiChar.prompt_anchor : ''}`,
      }],
    }

    return director
  } catch (err) {
    console.error('Gagal mem-parse director JSON. Konten asli:', content)
    throw new Error(`Format JSON Director dari AI tidak valid: ${(err as Error).message}`)
  }
}
