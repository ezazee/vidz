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
      content: `Kamu adalah pakar SEO YouTube dan spesialis konten dokumenter profesional (seperti Vox, Johnny Harris, dan Lemmino).
Tugasmu adalah menghasilkan Metadata SEO YouTube kelas dunia untuk topik video yang diberikan.
Kamu harus mengembalikan data HANYA dalam format JSON valid tanpa penjelasan tambahan dan tanpa blok markdown (\`\`\`json).

Skema JSON yang harus dikembalikan:
{
  "title": "Judul YouTube yang sangat teroptimasi SEO, berwibawa, mengandung kata kunci utama yang sering dicari, namun tetap memiliki tingkat CTR tinggi (menarik perhatian) tanpa terkesan clickbait murahan.",
  "description": "Deskripsi YouTube premium yang panjang dan kaya informasi. Harus mencakup: 1. Paragraf pembuka yang memikat dan penuh kata kunci relevan. 2. Ringkasan poin-poin penting dari video secara naratif dan edukatif. 3. Daftar kata kunci terkait dalam konteks kalimat alami untuk membantu algoritma pencarian. Harap gunakan bahasa Indonesia yang baku, menarik, dan profesional.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "minimal 10 tag pencarian spesifik dan relevan"],
  "hashtags": ["#tag1", "#tag2", "#tag3", "3-5 hashtag populer yang relevan"]
}`,
    },
    {
      role: 'user',
      content: `Topik Utama: "${input.topic}"

Ringkasan Riset Sejarah/Fakta:
${input.summary}

Naskah Lengkap Narasi Video:
${input.narrationText}

Buatkan judul, deskripsi, tag, dan hashtag yang sangat ramah mesin pencari (SEO-optimized) sesuai dengan instruksi sistem.`,
    },
  ], true, 'gemini-flash-grade')

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
