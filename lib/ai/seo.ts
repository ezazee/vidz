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

export async function generateSeoMetadata(input: SeoInput): Promise<SeoOutput> {
  const channel = getChannel(input.channelId)
  const isEn = channel.language === 'en'

  const userPrompt = isEn
    ? `Topic: "${input.topic}"
Summary: ${input.summary.slice(0, 400)}

Output YouTube SEO JSON, starting with { :
{"title":"catchy title under 80 characters, not clickbait","description":"long informative English description with relevant keywords, minimum 3 paragraphs","tags":["tag1","tag2","tag3","at least 10 tags"],"hashtags":["#hashtag1","#hashtag2","#hashtag3"]}`
    : `Topik: "${input.topic}"
Ringkasan: ${input.summary.slice(0, 400)}

Output JSON SEO YouTube, mulai dengan { :
{"title":"judul max 80 karakter menarik tidak clickbait","description":"deskripsi panjang informatif bahasa Indonesia dengan kata kunci relevan, minimal 3 paragraf","tags":["tag1","tag2","tag3","minimal 10 tag"],"hashtags":["#hashtag1","#hashtag2","#hashtag3"]}`

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
  // (untuk model Claude) menolak dengan "I can't help..." karena judul terbaca clickbait.
  // Retry 3x dulu: alias model dirotasi gateway, jadi percobaan berikutnya bisa dapat
  // model lain yang mau menjawab — daripada langsung jatuh ke fallback generik yang
  // merusak SEO video.
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
      return JSON.parse(cleaned) as SeoOutput
    } catch (err) {
      lastErr = err as Error
      console.error(`Gagal generate/parse JSON SEO (attempt ${attempt}/${maxAttempts}):`, lastErr.message)
    }
  }

  // Fallback: tetap jalan supaya SEO tidak pernah mematikan pipeline, tapi pakai
  // kategori channel sendiri — bukan tag hardcoded 'sejarah'/'sains' yang nyasar
  // di channel non-sejarah.
  console.error(`SEO pakai fallback setelah ${maxAttempts}x gagal:`, lastErr?.message)
  const cleanTopic = input.topic.replace(/\s*\[THEME:.*?\]\s*/gi, '').trim()
  const slug = cleanTopic.replace(/[^\p{L}\p{N}]+/gu, '')
  const categoryTags = channel.categories.slice(0, 4).map((c) => c.toLowerCase())
  const hashtagBase = channel.name.replace(/\s+/g, '')

  return isEn
    ? {
        title: `${cleanTopic} — Explained`,
        description: `A deep dive into ${cleanTopic}.\n\nSummary:\n${input.summary}\n\nGenerated automatically using StoryZ Studio.`,
        tags: [cleanTopic, ...categoryTags, 'explainer', 'education'],
        hashtags: [`#${hashtagBase}`, '#explainer', `#${slug}`],
      }
    : {
        title: `${cleanTopic} - ${channel.name}`,
        description: `${channel.tagline}\n\n${cleanTopic}\n\nRingkasan:\n${input.summary}\n\nDihasilkan secara otomatis menggunakan StoryZ Studio.`,
        tags: [cleanTopic, ...categoryTags, 'cerita', 'kisah nyata'],
        hashtags: [`#${hashtagBase}`, '#cerita', `#${slug}`],
      }
}
