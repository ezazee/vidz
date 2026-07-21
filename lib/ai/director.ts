import { chat } from './client'
import type { DirectorOutput } from '@/lib/pipeline/types'
import type { ResearchOutput } from '@/lib/ai/research'
import { getChannel, type ChannelId } from '@/lib/channels'

export interface DirectorInput {
  topic: string
  research: ResearchOutput
  channelId?: ChannelId
}

export async function generateDirector(input: DirectorInput): Promise<DirectorOutput> {
  const channel = getChannel(input.channelId)
  const isEn = channel.language === 'en'

  const userPrompt = isEn
    ? `Topic: "${input.topic}"
Summary: ${input.research.summary.slice(0, 300)}
Facts: ${input.research.facts.slice(0, 3).join(' | ')}

Video style: flat 2D cartoon illustration with one stick-figure character guiding the story.
Decide the character's costume/accessory that fits the topic (e.g. lab coat, detective hat, casual hoodie — pick what makes sense for the subject).

Output director bible JSON, starting with { :
{"genre":"...","visual_style":"flat 2D cartoon illustration","emotion":"...","lighting":"...","color_palette":["..."],"thumbnail_style":"...","voice_style":"clear engaging English narration","camera_style":"...","transition":"fade","image_style":"flat 2D hand-drawn cartoon illustration","visual_bible":{"genre":"...","visual_style":"...","image_style":"...","color_palette":["..."],"lighting":"...","emotion":"...","transition":"fade"},"character_bible":{"characters":[{"name":"${channel.mascotName}","description":"stick figure narrator guide","clothing":"costume fitting the topic, describe specifically in English","prompt_anchor":"wearing [short English costume description]"}]},"environment_bible":{"locations":[{"name":"...","description":"...","prompt_anchor":"..."}],"era":"...","geography":"..."},"camera_bible":{"default_movement":"pan_right","allowed_movements":["static","pan_left","pan_right","zoom_in"],"aspect_ratio":"16:9","composition_rules":"rule of thirds"},"motion_bible":{"transition_style":"soft dissolve","effect_palette":[],"timing":"medium"},"thumbnail_bible":{"style":"cartoon illustration","color_scheme":"warm bright","text_style":"bold impact","composition":"..."}}`
    : `Topik: "${input.topic}"
Ringkasan: ${input.research.summary.slice(0, 300)}
Fakta: ${input.research.facts.slice(0, 3).join(' | ')}

Gaya video: ilustrasi kartun flat 2D dengan satu karakter stick figure sebagai pemandu cerita.
Tentukan kostum/aksesoris karakter yang sesuai era & topik (misal: helm perang, blangkon, jas lab).

Output JSON director bible, mulai dengan { :
{"genre":"...","visual_style":"flat 2D cartoon illustration","emotion":"...","lighting":"...","color_palette":["..."],"thumbnail_style":"...","voice_style":"narasi bahasa Indonesia dramatis","camera_style":"...","transition":"fade","image_style":"flat 2D hand-drawn cartoon illustration","visual_bible":{"genre":"...","visual_style":"...","image_style":"...","color_palette":["..."],"lighting":"...","emotion":"...","transition":"fade"},"character_bible":{"characters":[{"name":"${channel.mascotName}","description":"stick figure pemandu cerita","clothing":"kostum sesuai era topik, jelaskan spesifik dalam bahasa Inggris","prompt_anchor":"wearing [kostum bahasa Inggris singkat]"}]},"environment_bible":{"locations":[{"name":"...","description":"...","prompt_anchor":"..."}],"era":"...","geography":"..."},"camera_bible":{"default_movement":"pan_right","allowed_movements":["static","pan_left","pan_right","zoom_in"],"aspect_ratio":"16:9","composition_rules":"rule of thirds"},"motion_bible":{"transition_style":"soft dissolve","effect_palette":[],"timing":"medium"},"thumbnail_bible":{"style":"cartoon illustration","color_scheme":"warm bright","text_style":"bold impact","composition":"..."}}`

  const messages = [
    {
      role: 'system' as const,
      content: isEn
        ? `You are a director for 2D animated explainer videos. Output ONLY raw JSON, no other text.`
        : `Kamu adalah sutradara video animasi ilustrasi 2D. Output HANYA JSON mentah, tanpa teks lain.`,
    },
    { role: 'user' as const, content: userPrompt },
  ]

  // AI kadang balikin JSON valid tapi diikuti teks nyasar (sama gejalanya kayak lib/ai/scenes.ts) —
  // retry 3x sebelum nyerah, daripada langsung matiin seluruh pipeline gara-gara satu respons cacat.
  const maxAttempts = 3
  let lastErr: Error | null = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const content = await chat(messages, true)
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
      director.image_style = channel.cartoonStyle
      director.visual_style = 'flat 2D cartoon illustration'
      const aiChar = director.character_bible?.characters?.[0]
      director.character_bible = {
        characters: [{
          name: channel.mascotName,
          description: `Stick figure narrator/mascot for ${channel.name}`,
          clothing: aiChar?.clothing ?? '',
          prompt_anchor: `${channel.mascotAnchor}${aiChar?.prompt_anchor ? ', ' + aiChar.prompt_anchor : ''}`,
        }],
      }

      return director
    } catch (err) {
      lastErr = err as Error
      console.error(`Gagal mem-parse director JSON (attempt ${attempt}/${maxAttempts}). Konten asli:`, content)
    }
  }
  throw new Error(`Format JSON Director dari AI tidak valid setelah ${maxAttempts}x percobaan: ${lastErr?.message}`)
}
