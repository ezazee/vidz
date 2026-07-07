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
      content: `Kamu adalah storyteller YouTube kelas atas — gaya bertutur seperti mendongeng ke teman, bukan membaca ensiklopedia. Output HANYA JSON mentah, tanpa teks lain.`,
    },
    {
      role: 'user',
      content: `Topik: "${input.topic}" | Bab: "${input.section.title}" (${input.section.type})
Konteks: ${input.section.description}
Emosi: ${input.director.emotion}

Buat TEPAT ${numScenes} scene, order_index mulai dari ${input.orderOffset}.

NARASI — aturan WAJIB:
- 28-38 kata per scene (2-3 kalimat, panjang kalimatnya bervariasi: ada yang pendek menghentak, ada yang mengalir).
- Sapa penonton dengan "kamu" minimal di beberapa scene. Pakai pertanyaan retoris sesekali ("Tapi apa jadinya kalau...?").
- Detail KONKRET: angka, tahun, nama orang, nama tempat. BUKAN frasa kosong seperti "sangat menarik", "luar biasa", "tidak dapat dipercaya".
- Bangun rasa penasaran: scene TERAKHIR bab ini harus menggantung (cliffhanger) supaya penonton lanjut nonton.
- Alur antar scene harus nyambung seperti cerita mengalir, bukan daftar fakta terpisah.
Contoh narasi BAIK (~33 kata): "Bayangkan kamu berdiri di pelabuhan Sunda Kelapa tahun 1595. Kapal-kapal asing muncul di cakrawala. Tapi kali ini... mereka bukan datang untuk menjajah. Mereka datang untuk bernegosiasi dengan kerajaan yang jauh lebih kuat."

image_prompt: bahasa Inggris. WAJIB berupa PEMANDANGAN/SETTING yang menggambarkan narasi: "[tempat/kejadian], [detail lingkungan], [mood]". JANGAN sebut karakter/orang utama dan JANGAN sebut gaya gambar — keduanya ditambahkan otomatis oleh sistem. Contoh: "ancient harbor city under attack, wooden warships firing cannons on turquoise sea, fortress walls and jungle hills, tense dramatic atmosphere".
pexels_query: selalu "" (kosong).
duration: 13-16 detik.

Output JSON mulai dengan { :
{"scenes":[{"order_index":${input.orderOffset},"narration":"...","subtitle":"...","image_prompt":"...","pexels_query":"","camera":"static","effect":"none","emotion":"tense","transition":"fade","duration":14}]}`,
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
    // Full AI illustration — Pexels B-roll dimatikan untuk konsistensi gaya kartun
    for (const s of parsed.scenes) s.pexels_query = ''
    return parsed.scenes
  } catch (err) {
    console.error('Gagal mem-parse scenes JSON. Konten asli:', content)
    throw new Error(`Format JSON Adegan dari AI tidak valid: ${(err as Error).message}`)
  }
}
