import { chat } from './client'

export interface OutlineSection {
  type: 'intro' | 'chapter' | 'ending'
  title: string
  order: number
  description: string
}

export interface OutlineOutput {
  sections: OutlineSection[]
}

export async function generateOutline(topic: string, summary: string): Promise<OutlineOutput> {
  const content = await chat([
    {
      role: 'system',
      content: `Kamu adalah penulis dokumenter. Balas HANYA JSON valid.
Schema: { "sections": [{ "type": "intro"|"chapter"|"ending", "title": string, "order": number, "description": string }] }
- 1 intro, 4-6 chapter, 1 ending
- Setiap chapter fokus pada satu aspek/periode`,
    },
    {
      role: 'user',
      content: `Buat outline video dokumenter YouTube tentang: "${topic}"\n\nRingkasan:\n${summary}`,
    },
  ])
  return JSON.parse(content) as OutlineOutput
}
