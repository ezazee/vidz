import { chat } from './client'
import { getChannel, type ChannelId } from '@/lib/channels'
import type { SceneDraft } from './scenes'

// Agent QA: cross-check hasil generate SEBELUM scene dipakai bikin gambar & suara
// (render.yml). Tiga sudut pandang berbeda — storyboard (isi cerita), voice script
// (kualitas ucapan), image prompt (visual) — masing-masing boleh merevisi scene
// yang bermasalah saja.
//
// ATURAN ANTI-LOOP (permintaan eksplisit): setiap agent maksimal MAX_ROUNDS putaran.
// Kalau setelah putaran terakhir masih ada catatan, revisi terakhir tetap dipakai dan
// pipeline lanjut — TIDAK pernah mengulang tanpa batas dan TIDAK pernah menggagalkan
// pipeline. QA yang error/timeout = scene asli dipakai apa adanya.
const MAX_ROUNDS = 2

// Batas revisi per putaran, biar output AI tidak membengkak di video dengan 40+ scene.
const MAX_REVISIONS_PER_ROUND = 8

export interface QAContext {
  topic: string
  channelId?: ChannelId
}

interface QAIssue {
  order_index: number
  problem: string
}

/** Field scene yang boleh ditulis ulang agent QA — semuanya bertipe string di SceneDraft. */
type EditableField = 'narration' | 'subtitle' | 'image_prompt'

type QARevision = { order_index: number } & Partial<Record<EditableField, string>>

interface QAVerdict {
  issues: QAIssue[]
  revisions: QARevision[]
}

export interface QAReport {
  agent: string
  rounds: number
  issuesFound: number
  revisionsApplied: number
  failed: boolean
}

type QAKind = 'storyboard' | 'voice' | 'image'

/** Field yang boleh disentuh tiap agent — mencegah agent image merusak narasi, dst. */
const EDITABLE: Record<QAKind, EditableField[]> = {
  storyboard: ['narration', 'subtitle'],
  voice: ['narration', 'subtitle'],
  image: ['image_prompt'],
}

function parseVerdict(content: string): QAVerdict {
  let cleaned = content.trim()
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) cleaned = cleaned.substring(start, end + 1)
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1')
  const parsed = JSON.parse(cleaned) as Partial<QAVerdict>
  return {
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    revisions: Array.isArray(parsed.revisions) ? parsed.revisions : [],
  }
}

/** Ringkas scene jadi teks padat — hemat token untuk video dengan banyak scene. */
function renderScenes(scenes: SceneDraft[], kind: QAKind): string {
  return scenes
    .map((s) => {
      if (kind === 'image') {
        return `#${s.order_index} | narasi: ${s.narration}\n      image_prompt: ${s.image_prompt}`
      }
      return `#${s.order_index} | ${s.narration}`
    })
    .join('\n')
}

function buildRubric(kind: QAKind, isEn: boolean, ctx: QAContext, channelName: string): string {
  if (kind === 'storyboard') {
    return isEn
      ? `You are a story editor reviewing the storyboard of a "${channelName}" video about "${ctx.topic}".

Check ONLY these:
1. CONSISTENCY — names, places, numbers, and the timeline must not contradict each other across scenes.
2. FLOW — scenes must read as one connected story, not a disconnected list of facts.
3. NOT GENERIC — each scene needs concrete detail (a number, a name, a place, a specific example). Flag empty filler like "very interesting", "amazing", "incredible".
4. LENGTH — roughly 28-38 words per scene.`
      : `Kamu adalah editor cerita yang memeriksa storyboard video "${channelName}" tentang "${ctx.topic}".

Periksa HANYA hal ini:
1. KONSISTENSI — nama tokoh, tempat, angka, dan urutan waktu tidak boleh saling bertentangan antar scene.
2. ALUR — antar scene harus nyambung jadi satu cerita, bukan daftar fakta terpisah.
3. TIDAK GENERIC — tiap scene butuh detail konkret (angka, nama, tempat, contoh spesifik). Tandai frasa kosong seperti "sangat menarik", "luar biasa", "tak terbayangkan".
4. PANJANG — sekitar 28-38 kata per scene.`
  }

  if (kind === 'voice') {
    return isEn
      ? `You are a voice-over director reviewing narration that will be read aloud by TTS for a "${channelName}" video.

Check ONLY these:
1. SPEAKABLE — no symbols, abbreviations, or number formats a TTS engine would mangle (write them out in words).
2. RHYTHM — sentence lengths must vary; flag scenes that are one long flat monotone sentence.
3. CONSISTENT ADDRESS — the way the viewer is addressed ("you") must stay consistent across the whole video.
4. NATURAL — conversational, like telling a friend; flag stiff or overly formal writing.

Do NOT change the meaning or facts of a scene — only how it is worded.`
      : `Kamu adalah pengarah pengisi suara yang memeriksa narasi yang akan dibacakan mesin TTS untuk video "${channelName}".

Periksa HANYA hal ini:
1. BISA DIUCAPKAN — tidak ada simbol, singkatan, atau format angka yang bakal salah dibaca TTS (tulis dengan huruf).
2. RITME — panjang kalimat harus bervariasi; tandai scene yang cuma satu kalimat panjang monoton.
3. SAPAAN KONSISTEN — cara menyapa penonton ("kamu") harus konsisten sepanjang video.
4. NATURAL — gaya bertutur seperti bercerita ke teman; tandai kalimat yang kaku atau terlalu formal.

JANGAN ubah makna atau fakta scene — hanya cara penyampaiannya.`
  }

  // image
  return isEn
    ? `You are an art director reviewing image prompts for a "${channelName}" video.

IMPORTANT — the rendering system automatically prepends the art style and the main character's physical description to every prompt. So each image_prompt must contain ONLY the action and setting.

Check ONLY these:
1. NOT GENERIC — flag empty prompts like "a person standing" or an empty landscape. Every scene needs action, people, and interaction.
2. MATCHES THE NARRATION — the visual must depict what its own scene narrates.
3. NO CHARACTER DESCRIPTION — flag any prompt describing the main character's face, hair, body, or clothing (it is added automatically and would conflict).
4. NO ART STYLE — flag mentions of style ("cartoon", "vector", "3d render", "illustration") for the same reason.
5. VISUAL CONSISTENCY — the same location or supporting character must be described the same way across scenes.

image_prompt must be written in English.`
    : `Kamu adalah art director yang memeriksa image prompt untuk video "${channelName}".

PENTING — sistem render otomatis menambahkan gaya gambar dan deskripsi fisik karakter utama di depan setiap prompt. Jadi tiap image_prompt HANYA boleh berisi aksi dan setting.

Periksa HANYA hal ini:
1. TIDAK GENERIC — tandai prompt kosong seperti "seseorang berdiri" atau pemandangan kosong. Tiap scene butuh aksi, ada orang, ada interaksi.
2. NYAMBUNG DENGAN NARASI — visualnya harus menggambarkan isi narasi scene itu sendiri.
3. TANPA DESKRIPSI KARAKTER — tandai prompt yang mendeskripsikan wajah, rambut, tubuh, atau pakaian karakter utama (sudah ditambah otomatis, nanti bentrok).
4. TANPA GAYA GAMBAR — tandai penyebutan gaya ("kartun", "vector", "3d render", "ilustrasi") dengan alasan yang sama.
5. KONSISTENSI VISUAL — lokasi atau tokoh pendukung yang sama harus dideskripsikan sama antar scene.

image_prompt WAJIB ditulis dalam bahasa Inggris.`
}

function buildSchema(kind: QAKind, isEn: boolean): string {
  const field =
    kind === 'image'
      ? '"image_prompt":"perbaikan prompt"'
      : '"narration":"perbaikan narasi","subtitle":"disamakan dengan narasi"'
  const fieldEn =
    kind === 'image'
      ? '"image_prompt":"fixed prompt"'
      : '"narration":"fixed narration","subtitle":"same as narration"'

  return isEn
    ? `Output JSON only, starting with { :
{"issues":[{"order_index":0,"problem":"short reason"}],"revisions":[{"order_index":0,${fieldEn}}]}

Rules:
- Flag ONLY genuine problems. Do not nitpick. A scene that is merely "could be better" is fine — leave it alone.
- If everything is acceptable, return {"issues":[],"revisions":[]}.
- Every order_index in "issues" must have a matching entry in "revisions" with the fix already written.
- Maximum ${MAX_REVISIONS_PER_ROUND} revisions. If more scenes have problems, fix the worst ${MAX_REVISIONS_PER_ROUND} only.
- Keep the same language as the original text.`
    : `Output HANYA JSON, mulai dengan { :
{"issues":[{"order_index":0,"problem":"alasan singkat"}],"revisions":[{"order_index":0,${field}}]}

Aturan:
- Tandai HANYA masalah yang benar-benar nyata. Jangan cerewet. Scene yang sekadar "masih bisa lebih bagus" itu sudah cukup — biarkan saja.
- Kalau semua sudah layak, balas {"issues":[],"revisions":[]}.
- Setiap order_index di "issues" wajib punya pasangan di "revisions" berisi perbaikannya langsung.
- Maksimal ${MAX_REVISIONS_PER_ROUND} revisi. Kalau lebih banyak yang bermasalah, perbaiki ${MAX_REVISIONS_PER_ROUND} yang paling parah saja.
- Pertahankan bahasa asli teksnya.`
}

/**
 * Jalankan satu agent QA atas seluruh scene. Scene dimutasi langsung (in-place).
 * Tidak pernah melempar error — kegagalan QA = scene asli dipakai apa adanya.
 */
async function runAgent(kind: QAKind, scenes: SceneDraft[], ctx: QAContext): Promise<QAReport> {
  const channel = getChannel(ctx.channelId)
  const isEn = channel.language === 'en'
  const label = { storyboard: 'Storyboard', voice: 'Voice Script', image: 'Image Prompt' }[kind]
  const report: QAReport = { agent: label, rounds: 0, issuesFound: 0, revisionsApplied: 0, failed: false }

  const byIndex = new Map(scenes.map((s) => [s.order_index, s]))
  const allowed = EDITABLE[kind]

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    report.rounds = round
    const lastRound = round === MAX_ROUNDS

    let verdict: QAVerdict
    try {
      const content = await chat(
        [
          {
            role: 'system',
            content: isEn
              ? 'You are a strict but practical quality reviewer. Output ONLY raw JSON, no other text.'
              : 'Kamu adalah pemeriksa kualitas yang tegas tapi praktis. Output HANYA JSON mentah, tanpa teks lain.',
          },
          {
            role: 'user',
            content: `${buildRubric(kind, isEn, ctx, channel.name)}

${isEn ? 'Scenes' : 'Daftar scene'}:
${renderScenes(scenes, kind)}

${buildSchema(kind, isEn)}`,
          },
        ],
        true,
      )
      verdict = parseVerdict(content)
    } catch (err) {
      // QA gagal (timeout / JSON cacat / model menolak) — jangan ganggu pipeline.
      console.warn(`[QA:${label}] putaran ${round} gagal, scene dipakai apa adanya:`, (err as Error).message)
      report.failed = true
      return report
    }

    if (verdict.issues.length === 0) {
      console.log(`[QA:${label}] lolos di putaran ${round} — tidak ada revisi.`)
      return report
    }

    report.issuesFound += verdict.issues.length

    let applied = 0
    for (const rev of verdict.revisions.slice(0, MAX_REVISIONS_PER_ROUND)) {
      const scene = byIndex.get(rev.order_index)
      if (!scene) continue
      let touched = false
      for (const field of allowed) {
        const value = rev[field]
        if (typeof value === 'string' && value.trim() && value.trim() !== scene[field]) {
          scene[field] = value.trim()
          touched = true
        }
      }
      if (touched) applied++
    }
    report.revisionsApplied += applied

    console.log(
      `[QA:${label}] putaran ${round}: ${verdict.issues.length} catatan, ${applied} scene direvisi.`,
    )
    for (const issue of verdict.issues.slice(0, 5)) {
      console.log(`  └─ #${issue.order_index}: ${issue.problem}`)
    }

    // Tidak ada yang berhasil diterapkan → putaran berikutnya percuma, hentikan.
    if (applied === 0) {
      console.log(`[QA:${label}] tidak ada revisi yang bisa diterapkan, berhenti di putaran ${round}.`)
      return report
    }

    if (lastRound) {
      console.log(`[QA:${label}] batas ${MAX_ROUNDS} putaran tercapai — hasil terakhir diterima apa adanya.`)
    }
  }

  return report
}

/**
 * Cross-check seluruh scene sebelum masuk tahap gambar & suara.
 *
 * Urutan disengaja: storyboard (isi cerita) → voice (poles cara ucap teks yang sama)
 * → image (paling akhir, supaya visual mengacu ke narasi yang SUDAH final).
 */
export async function crossCheckScenes(scenes: SceneDraft[], ctx: QAContext): Promise<QAReport[]> {
  if (scenes.length === 0) return []
  const reports: QAReport[] = []
  for (const kind of ['storyboard', 'voice', 'image'] as QAKind[]) {
    reports.push(await runAgent(kind, scenes, ctx))
  }
  return reports
}
