import { chat } from './client'

export interface ResearchOutput {
  summary: string
  facts: string[]
  timeline: { year: string; event: string }[]
  references: string[]
}


async function scrapeWebForTopic(topic: string): Promise<string> {
  try {
    console.log(`Scraping web for topic: ${topic}...`);
    const res = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: `q=${encodeURIComponent(topic)}`
    });
    const html = await res.text();
    const regex = /class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/g;
    let match;
    const results = [];
    while ((match = regex.exec(html)) !== null && results.length < 5) {
      results.push(match[1].trim().replace(/<[^>]*>?/gm, ''));
    }
    if (results.length > 0) {
      return "\n\nBERIKUT ADALAH HASIL PENCARIAN INTERNET TERKINI UNTUK REFERENSI (JANGAN HALUSINASI, GUNAKAN FAKTA INI):\n- " + results.join("\n- ");
    }
  } catch (err) {
    console.error('Failed to scrape web:', err);
  }
  return '';
}

export async function generateResearch(topic: string): Promise<ResearchOutput> {
  
  const searchContext = await scrapeWebForTopic(topic);
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
      content: `Lakukan riset mendalam tentang topik: "${topic}"` + searchContext,
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
