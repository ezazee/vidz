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
  ], true, 'gemini-flash-grade')

  try {
    let cleaned = content.trim()
    const startCurly = cleaned.indexOf('{')
    const endCurly = cleaned.lastIndexOf('}')
    if (startCurly !== -1 && endCurly !== -1 && endCurly > startCurly) {
      cleaned = cleaned.substring(startCurly, endCurly + 1)
    }
    return JSON.parse(cleaned) as ResearchOutput
  } catch (err) {
    console.error('Gagal mem-parse research JSON. Konten asli:', content)
    throw new Error(`Format JSON Research dari AI tidak valid: ${(err as Error).message}`)
  }
}
