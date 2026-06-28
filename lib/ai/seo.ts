import { chat } from './client'

export interface SeoInput {
  topic: string
  summary: string
  narrationText: string
}

export interface SeoOutput {
  title: string
  description: string
  tags: string[]
  hashtags: string[]
}

export async function generateSeoMetadata(input: SeoInput): Promise<SeoOutput> {
  const content = await chat([
    {
      role: 'system',
      content: `Kamu adalah pakar SEO YouTube. Output HANYA JSON mentah, tanpa teks lain.`,
    },
    {
      role: 'user',
      content: `Topik: "${input.topic}"
Ringkasan: ${input.summary.slice(0, 400)}

Output JSON SEO YouTube, mulai dengan { :
{"title":"judul max 80 karakter menarik tidak clickbait","description":"deskripsi panjang informatif bahasa Indonesia dengan kata kunci relevan, minimal 3 paragraf","tags":["tag1","tag2","tag3","minimal 10 tag"],"hashtags":["#hashtag1","#hashtag2","#hashtag3"]}`,
    },
  ], true)

  try {
    // Bersihkan jika model tidak sengaja menyertakan markdown wrap
    const cleaned = content.trim().replace(/^```json/, '').replace(/```$/, '').trim()
    return JSON.parse(cleaned) as SeoOutput
  } catch (e) {
    console.error('Gagal melakukan parsing JSON SEO, menggunakan fallback...', e)
    return {
      title: `${input.topic} - Dokumenter Lengkap`,
      description: `Dokumenter mendalam mengenai ${input.topic}.\n\nRingkasan:\n${input.summary}\n\nDihasilkan secara otomatis menggunakan StoryZ Studio.`,
      tags: [input.topic, 'dokumenter', 'sejarah', 'edukasi', 'sains'],
      hashtags: ['#dokumenter', '#sejarah', `#${input.topic.replace(/\s+/g, '')}`],
    }
  }
}
