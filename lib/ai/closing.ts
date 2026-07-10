import { chat } from './client'

// #1 Closing insight — 2-4 kalimat opini/refleksi analitis di akhir tiap video.
// Bukan rangkuman ulang cerita, tapi sudut pandang "Cabang Sejarah" — ini yang
// membedakan konten dari sekadar hasil generate AI mentah (mitigasi inauthentic content).
export async function generateClosingInsight(topic: string, narrationText: string): Promise<string> {
  const cleanTopic = topic.replace(/\s*\[THEME:.*?\]\s*/gi, '')
  try {
    const content = await chat([
      {
        role: 'system',
        content: `Kamu adalah narator channel "Cabang Sejarah" yang cerdas dan punya opini. Output HANYA teks penutup, tanpa label/JSON/markdown.`,
      },
      {
        role: 'user',
        content: `Topik video: "${cleanTopic}"
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
