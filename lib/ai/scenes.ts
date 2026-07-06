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
      content: `Kamu adalah penulis naskah video "what-if" sejarah alternatif bergaya kartun ilustrasi. Output HANYA JSON mentah, tanpa teks lain.`,
    },
    {
      role: 'user',
      content: `Topik: "${input.topic}" | Bab: "${input.section.title}" (${input.section.type})
Konteks: ${input.section.description}
Emosi: ${input.director.emotion}

Buat TEPAT ${numScenes} scene, order_index mulai dari ${input.orderOffset}.
Narasi: WAJIB 18-25 kata per scene (1-2 kalimat pendek). Fakta spesifik, dramatis, BUKAN judul/frasa kosong.
Contoh narasi BAIK (~20 kata): "Pukul 10:02 pagi, gelombang panas 800 derajat Celsius menyapu seluruh pantai Anyer hanya dalam dua menit."
image_prompt: bahasa Inggris. WAJIB berupa AKSI/ADEGAN yang menggambarkan narasi, dengan format: "[what the main character is doing], [setting/background detail], [mood]". JANGAN sebut gaya gambar atau deskripsi fisik karakter — itu ditambahkan otomatis oleh sistem. Contoh: "standing on a fortress wall pointing at incoming warships, ancient harbor city with wooden ships in background, tense atmosphere".
pexels_query: selalu "" (kosong).
duration: 10-12 detik.

Output JSON mulai dengan { :
{"scenes":[{"order_index":${input.orderOffset},"narration":"...","subtitle":"...","image_prompt":"...","pexels_query":"","camera":"static","effect":"none","emotion":"tense","transition":"fade","duration":11}]}`,
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
