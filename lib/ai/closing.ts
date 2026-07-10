import { chat } from './client'
import { getChannel, type ChannelId } from '@/lib/channels'

// #1 Closing insight — 2-4 kalimat opini/refleksi analitis di akhir tiap video.
// Bukan rangkuman ulang cerita, tapi sudut pandang editorial channel — ini yang
// membedakan konten dari sekadar hasil generate AI mentah (mitigasi inauthentic content).
export async function generateClosingInsight(topic: string, narrationText: string, channelId?: ChannelId): Promise<string> {
  const channel = getChannel(channelId)
  const isEn = channel.language === 'en'
  const cleanTopic = topic.replace(/\s*\[THEME:.*?\]\s*/gi, '')
  try {
    const content = await chat([
      {
        role: 'system',
        content: isEn
          ? `You are the narrator of "${channel.name}", sharp and opinionated. Output ONLY the closing text, no labels/JSON/markdown.`
          : `Kamu adalah narator channel "${channel.name}" yang cerdas dan punya opini. Output HANYA teks penutup, tanpa label/JSON/markdown.`,
      },
      {
        role: 'user',
        content: isEn
          ? `Video topic: "${cleanTopic}"
Script summary:
${narrationText.slice(0, 1500)}

Write 2-4 CLOSING sentences that are an insight/opinion/analytical reflection on this topic — NOT a recap of the story. Give a point of view: why this matters, a takeaway, or something people usually overlook. Conversational tone, address the viewer as "you", end with a thought-provoking line. English. Write only the closing.`
          : `Topik video: "${cleanTopic}"
Ringkasan naskah:
${narrationText.slice(0, 1500)}

Tulis 2-4 kalimat PENUTUP berupa insight/opini/refleksi analitis dari skenario what-if ini — BUKAN rangkuman ulang cerita. Kasih sudut pandang: kenapa skenario ini masuk akal/tidak, pelajaran yang bisa diambil, atau satu hal yang sering dilewatkan orang. Gaya bertutur, sapa "kamu", diakhiri dengan ajakan berpikir. Bahasa Indonesia. Langsung tulis penutupnya.`,
      },
    ])
    return content.trim().replace(/^["']|["']$/g, '')
  } catch (e) {
    console.error('Gagal generate closing insight:', e)
    return ''
  }
}
