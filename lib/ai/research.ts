import { chat } from './client'

export interface ResearchOutput {
  summary: string
  facts: string[]
  timeline: { year: string; event: string }[]
  references: string[]
}

export async function generateResearch(topic: string): Promise<ResearchOutput> {
  const content = await chat([
    {
      role: 'system',
      content: `Kamu adalah researcher dokumenter. Balas HANYA dengan JSON valid tanpa markdown.
Schema: { "summary": string, "facts": string[], "timeline": [{ "year": string, "event": string }], "references": string[] }
- summary: 2-3 paragraf ringkasan topik
- facts: 8-12 fakta menarik dan spesifik
- timeline: urutan kronologis kejadian penting
- references: sumber atau tokoh kunci yang relevan`,
    },
    {
      role: 'user',
      content: `Lakukan riset mendalam tentang topik: "${topic}"`,
    },
  ])

  return JSON.parse(content) as ResearchOutput
}
