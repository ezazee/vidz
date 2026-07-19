import { chat } from './client'
import type { OutlineSection } from './outline'
import type { DirectorOutput } from '@/lib/pipeline/types'
import { getChannel, type ChannelId } from '@/lib/channels'

export interface SceneInput {
  section: OutlineSection
  topic: string
  director: Pick<DirectorOutput, 'visual_style' | 'voice_style' | 'emotion' | 'camera_style' | 'transition' | 'image_style'>
  orderOffset: number
  fullOutline?: OutlineSection[]
  channelId?: ChannelId
}

export interface SceneDraft {
  order_index: number
  narration: string
  subtitle: string
  image_prompt: string
  pexels_query: string
  camera: string
  effect: string
  emotion: string
  transition: string
  duration: number
}

export async function generateScenes(input: SceneInput): Promise<SceneDraft[]> {
  const channel = getChannel(input.channelId)
  const isEn = channel.language === 'en'

  const outlineContext = input.fullOutline
    ? (isEn
        ? `Full Outline Structure:\n${input.fullOutline.map(s => `- [${s.type.toUpperCase()}] ${s.title}`).join('\n')}`
        : `Struktur Lengkap Outline:\n${input.fullOutline.map(s => `- [${s.type.toUpperCase()}] ${s.title}`).join('\n')}`)
    : ''

  const numScenes = input.section.type === 'intro' || input.section.type === 'ending' ? 6 : 10

  const userPrompt = isEn
    ? `Topic: "${input.topic}" | Chapter: "${input.section.title}" (${input.section.type})
Context: ${input.section.description}
Mood: ${input.director.emotion}
${outlineContext}

Create EXACTLY ${numScenes} scenes, order_index starting from ${input.orderOffset}.

NARRATION — mandatory rules:
- 28-38 words per scene (2-3 sentences, vary sentence length: some punchy and short, some flowing).
- Address the viewer as "you" in at least a few scenes. Use rhetorical questions occasionally ("But what happens when...?").
- CONCRETE details: numbers, studies, names, specific examples. NOT empty phrases like "very interesting", "amazing", "incredible".
- Build curiosity: the LAST scene of this chapter must end on a hook so the viewer keeps watching.
- Scenes must flow as a connected story, not a disconnected list of facts.
Good narration example (~33 words): "You've done it a hundred times. Phone buzzes, you check it in under a second — before you've even decided to. That's not a habit. That's your brain running code it wrote decades ago."

image_prompt: in English. Format: "[main character's action matching the narration], [other people/context relevant to the scene], [setting & mood]". Do NOT describe the main character's physical appearance or art style — added automatically by the system. Make the scene feel ALIVE: people, action, interaction — not an empty background. Example: "sitting at a desk staring at a phone screen glowing in a dark room, blurred clock showing 2am in the background, other people asleep in soft moonlight, tense insomniac atmosphere".
pexels_query: always "" (empty).
duration: 13-16 seconds.

Output JSON starting with { :
{"scenes":[{"order_index":${input.orderOffset},"narration":"...","subtitle":"...","image_prompt":"...","pexels_query":"","camera":"static","effect":"none","emotion":"curious","transition":"fade","duration":14}]}`
    : `Topik: "${input.topic}" | Bab: "${input.section.title}" (${input.section.type})
Konteks: ${input.section.description}
Emosi: ${input.director.emotion}
${outlineContext}

Buat TEPAT ${numScenes} scene, order_index mulai dari ${input.orderOffset}.

NARASI — aturan WAJIB:
- 28-38 kata per scene (2-3 kalimat, panjang kalimatnya bervariasi: ada yang pendek menghentak, ada yang mengalir).
- Sapa penonton dengan "kamu" minimal di beberapa scene. Pakai pertanyaan retoris sesekali ("Tapi apa jadinya kalau...?").
- Detail KONKRET: angka, tahun, nama orang, nama tempat. BUKAN frasa kosong seperti "sangat menarik", "luar biasa", "tidak dapat dipercaya".
- Bangun rasa penasaran: scene TERAKHIR bab ini harus menggantung (cliffhanger) supaya penonton lanjut nonton.
- Alur antar scene harus nyambung seperti cerita mengalir, bukan daftar fakta terpisah.
Contoh narasi BAIK (~33 kata): "Bayangkan kamu berdiri di pelabuhan Sunda Kelapa tahun 1595. Kapal-kapal asing muncul di cakrawala. Tapi kali ini... mereka bukan datang untuk menjajah. Mereka datang untuk bernegosiasi dengan kerajaan yang jauh lebih kuat."

image_prompt: bahasa Inggris. ${channel.prompts.sceneImageRules}
pexels_query: selalu "" (kosong).
duration: 13-16 detik.

Output JSON mulai dengan { :
{"scenes":[{"order_index":${input.orderOffset},"narration":"...","subtitle":"...","image_prompt":"...","pexels_query":"","camera":"static","effect":"none","emotion":"tense","transition":"fade","duration":14}]}`

  const messages = [
    {
      role: 'system' as const,
      content: isEn
        ? `${channel.prompts.narratorPersona} Output ONLY raw JSON, no other text.`
        : `Kamu adalah storyteller YouTube kelas atas — gaya bertutur seperti mendongeng ke teman, bukan membaca ensiklopedia. Output HANYA JSON mentah, tanpa teks lain.`,
    },
    { role: 'user' as const, content: userPrompt },
  ]

  // AI kadang balikin JSON yang rusak sekali-sekali (glitch, bukan pola tetap) — retry 3x sebelum
  // nyerah, daripada langsung matiin seluruh pipeline video gara-gara satu respons cacat.
  const maxAttempts = 3
  let lastErr: Error | null = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const content = await chat(messages, true)
    try {
      let cleaned = content.trim()
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim()
      const startCurly = cleaned.indexOf('{')
      const endCurly = cleaned.lastIndexOf('}')
      if (startCurly !== -1 && endCurly !== -1 && endCurly > startCurly) {
        cleaned = cleaned.substring(startCurly, endCurly + 1)
      }
      const parsed = JSON.parse(cleaned) as { scenes: SceneDraft[] }
      // Full AI illustration — Pexels B-roll dimatikan untuk konsistensi gaya kartun
      for (const s of parsed.scenes) s.pexels_query = ''
      return parsed.scenes
    } catch (err) {
      lastErr = err as Error
      console.error(`Gagal mem-parse scenes JSON (attempt ${attempt}/${maxAttempts}). Konten asli:`, content)
    }
  }
  throw new Error(`Format JSON Adegan dari AI tidak valid setelah ${maxAttempts}x percobaan: ${lastErr?.message}`)
}
