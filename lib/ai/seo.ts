import { chat } from './client'
import { getChannel, type ChannelId } from '@/lib/channels'

export interface SeoInput {
  topic: string
  summary: string
  narrationText: string
  channelId?: ChannelId
}

export interface SeoOutput {
  title: string
  description: string
  tags: string[]
  hashtags: string[]
}

/** Potong ke <=80 karakter di batas kata terakhir yang muat — jangan pernah
 *  putus di tengah kata. */
function truncateTitle(title: string, max = 80): string {
  if (title.length <= max) return title
  const cut = title.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()
}

export async function generateSeoMetadata(input: SeoInput): Promise<SeoOutput> {
  const channel = getChannel(input.channelId)
  const isEn = channel.language === 'en'

  // Percobaan minta AI "salin verbatim" judul topik selalu gagal konsisten — model
  // (model apa pun, termasuk yang sudah di-pin) tetap "merapikan"/memendekkan judul
  // walau sudah diinstruksikan jangan, karena system prompt "kamu pakar SEO" bikin dia
  // ngotot optimasi. Topik yang masuk ke sini SUDAH judul final yang divalidasi di
  // tahap-tahap sebelumnya (research/outline) — tidak perlu ditulis ulang AI sama
  // sekali. Judul dihitung programatik, AI cuma kerjain description/tags/hashtags.
  const cleanTopic = input.topic.replace(/\s*\[THEME:.*?\]\s*/gi, '').trim()
  const title = truncateTitle(cleanTopic)

  const userPrompt = isEn
    ? `Video title: "${title}"
Summary: ${input.summary.slice(0, 400)}

Output YouTube SEO JSON, starting with { :
{"description":"long informative English description with relevant keywords, minimum 3 paragraphs","tags":["tag1","tag2","tag3","at least 10 tags"],"hashtags":["#hashtag1","#hashtag2","#hashtag3"]}`
    : `Judul video: "${title}"
Ringkasan: ${input.summary.slice(0, 400)}

Output JSON SEO YouTube, mulai dengan { :
{"description":"deskripsi panjang informatif bahasa Indonesia dengan kata kunci relevan, minimal 3 paragraf","tags":["tag1","tag2","tag3","minimal 10 tag"],"hashtags":["#hashtag1","#hashtag2","#hashtag3"]}`

  const messages = [
    {
      role: 'system' as const,
      content: isEn
        ? `You are a YouTube SEO expert. Output ONLY raw JSON, no other text.`
        : `Kamu adalah pakar SEO YouTube. Output HANYA JSON mentah, tanpa teks lain.`,
    },
    { role: 'user' as const, content: userPrompt },
  ]

  // Sama polanya kayak outline.ts/scenes.ts — model kadang balikin JSON cacat, atau
  // (untuk model Claude) menolak dengan "I can't help..." karena judulnya terbaca
  // clickbait. Retry 3x sebelum jatuh ke fallback.
  const maxAttempts = 3
  let lastErr: Error | null = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const content = await chat(messages, true)
      let cleaned = content.trim()
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim()
      const startCurly = cleaned.indexOf('{')
      const endCurly = cleaned.lastIndexOf('}')
      if (startCurly !== -1 && endCurly !== -1 && endCurly > startCurly) {
        cleaned = cleaned.substring(startCurly, endCurly + 1)
      }
      cleaned = cleaned.replace(/,\s*([\]}])/g, '$1')
      const parsed = JSON.parse(cleaned) as Omit<SeoOutput, 'title'>
      return { title, ...parsed }
    } catch (err) {
      lastErr = err as Error
      console.error(`Gagal generate/parse JSON SEO (attempt ${attempt}/${maxAttempts}):`, lastErr.message)
    }
  }

  // Fallback: tetap jalan supaya SEO tidak pernah mematikan pipeline, tapi pakai
  // kategori channel sendiri — bukan tag hardcoded 'sejarah'/'sains' yang nyasar
  // di channel non-sejarah.
  console.error(`SEO pakai fallback setelah ${maxAttempts}x gagal:`, lastErr?.message)
  const slug = title.replace(/[^\p{L}\p{N}]+/gu, '')
  const categoryTags = channel.categories.slice(0, 4).map((c) => c.toLowerCase())
  const hashtagBase = channel.name.replace(/\s+/g, '')

  return isEn
    ? {
        title,
        description: `A deep dive into ${title}.\n\nSummary:\n${input.summary}\n\nGenerated automatically using StoryZ Studio.`,
        tags: [title, ...categoryTags, 'explainer', 'education'],
        hashtags: [`#${hashtagBase}`, '#explainer', `#${slug}`],
      }
    : {
        title,
        description: `${channel.tagline}\n\n${title}\n\nRingkasan:\n${input.summary}\n\nDihasilkan secara otomatis menggunakan StoryZ Studio.`,
        tags: [title, ...categoryTags, 'cerita', 'kisah nyata'],
        hashtags: [`#${hashtagBase}`, '#cerita', `#${slug}`],
      }
}
