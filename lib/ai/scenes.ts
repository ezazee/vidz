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
  pexels_query: string
  camera: string
  effect: string
  emotion: string
  transition: string
  duration: number
}

export async function generateScenes(input: SceneInput): Promise<SceneDraft[]> {
  const outlineContext = input.fullOutline
    ? `Struktur Lengkap Outline:\n${input.fullOutline.map(s => `- [${s.type.toUpperCase()}] ${s.title}`).join('\n')}`
    : ''

  const numScenes = input.section.type === 'intro' || input.section.type === 'ending' ? 6 : 10

  const content = await chat([
    {
      role: 'system',
      content: `Kamu adalah penulis naskah dokumenter Netflix/Vice kelas dunia. Output HANYA JSON mentah, tanpa teks lain, tanpa markdown.
Schema: { "scenes": [{ "order_index": number, "narration": string, "subtitle": string, "image_prompt": string, "pexels_query": string, "camera": "static"|"pan_left"|"pan_right"|"zoom_in"|"zoom_out"|"tilt_up"|"tilt_down", "effect": "none"|"light_rays"|"fog"|"dust", "emotion": string, "transition": "cut"|"fade"|"dissolve"|"wipe", "duration": number }] }

ATURAN NARASI (PALING PENTING):
- Narasi WAJIB berupa kalimat lengkap — BUKAN judul, BUKAN frasa pendek
- Terasa seperti Netflix documentary voiceover — dramatis, intim, menghantui
- WAJIB 20-35 kata per scene (1-2 kalimat, target baca TTS 10-14 detik)
- duration WAJIB antara 12-15 (detik), sesuai panjang narasi
- MULAI dengan fakta spesifik, angka, atau detail sensoris yang mengejutkan
- DILARANG: narasi yang hanya berupa judul/frasa seperti "Detik-Detik Terakhir" atau "Kesalahan Fatal"

Contoh narasi BAIK:
- "Pukul 23:40, sonar RMS Titanic mendeteksi gunung es sejauh 400 meter. Kapten Smith punya 37 detik untuk menghindar — dan ia memilih yang salah."
- "Reaktor nomor empat meledak dengan kekuatan 400 bom Hiroshima. Radiasi itu tidak terlihat, tidak berbau — tapi dalam tiga jam, 134 pemadam kebakaran sudah terbaring sekarat."
- "Satu baris kode. Ditulis pada 1969. Dibiarkan selama 30 tahun. Dan pada 1 Januari 2000, ia hampir menghancurkan sistem perbankan seluruh dunia."

Contoh narasi BURUK (DILARANG):
- "Detik-Detik Terakhir yang Menentukan" ← ini judul, bukan narasi
- "Tragedi yang Mengguncang Dunia" ← terlalu umum, tidak ada fakta
- "Kesalahan Fatal yang Mengubah Segalanya" ← frasa kosong tanpa konten

ATURAN IMAGE PROMPT (SANGAT PENTING):
- image_prompt WAJIB dalam bahasa Inggris
- Format: [subject/scene], [visual style], [lighting], [mood], [camera angle], [extra detail]
- Contoh BAIK: "Close-up of a cracked nuclear reactor control panel with red emergency lights flickering, cinematic photography, dramatic chiaroscuro lighting, tense atmosphere, eye-level angle, film grain texture, ultra-detailed"
- Contoh BURUK: "gambar reaktor nuklir yang rusak"
- WAJIB spesifik: sebutkan objek konkret, warna, cahaya, angle, dan mood
- Style: ${input.director.image_style}, photorealistic, 8k uhd, cinematic

ATURAN PEXELS QUERY:
- ISI dengan 1-3 kata bahasa Inggris HANYA untuk B-roll umum yang PASTI ada di stock video: "ocean waves", "city traffic", "forest rain", "crowd panic", "space stars", "server room", "laboratory", "nuclear plant", "hacker typing"
- KOSONGKAN ("") untuk: wajah tokoh spesifik, hewan langka, monster, adegan perang detail, objek unik yang tidak mungkin ada di stock video
- Kalau ragu, KOSONGKAN — AI image lebih akurat untuk hal spesifik`,
    },
    {
      role: 'user',
      content: `Topik video: "${input.topic}"
${outlineContext}

BAB INI: "${input.section.title}" (${input.section.type})
Konteks bab: ${input.section.description}

Panduan visual sutradara:
- Visual style: ${input.director.visual_style}
- Voice style: ${input.director.voice_style}
- Image style: ${input.director.image_style}
- Emotion: ${input.director.emotion}

WAJIB buat TEPAT ${numScenes} scene untuk bab ini saja. Jangan overlap dengan bab lain.
order_index mulai dari ${input.orderOffset}.

Ingat: setiap narasi harus terasa seperti kalimat pembuka yang bisa viral di TikTok/YouTube Shorts — langsung ke inti, dramatis, bikin penasaran.`,
    },
  ], true)

  try {
    let cleaned = content.trim()
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim()
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
