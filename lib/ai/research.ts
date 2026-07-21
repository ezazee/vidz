import { chat } from './client'

export interface ResearchOutput {
  summary: string
  facts: string[]
  timeline: { year: string; event: string }[]
  references: string[]
}


async function scrapeWebForTopic(topic: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout

  try {
    console.log(`Scraping web for topic: ${topic}...`);
    const res = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: `q=${encodeURIComponent(topic)}`,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
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
  } catch {
    console.error('Scraping web failed or timed out, proceeding with AI knowledge...');
  } finally {
    clearTimeout(timeoutId);
  }
  return '';
}

export async function generateResearch(topic: string): Promise<ResearchOutput> {
  
  const searchContext = await scrapeWebForTopic(topic);
  const messages = [
    {
      role: 'system' as const,
      content: `Kamu adalah researcher dokumenter profesional. Output HANYA JSON mentah, tanpa teks lain.`,
    },
    {
      role: 'user' as const,
      content: `Riset mendalam tentang: "${topic}"${searchContext}

Output JSON persis seperti ini, mulai dengan { :
{"summary":"2-3 paragraf ringkasan","facts":["fakta spesifik 1","fakta spesifik 2","...8-12 fakta"],"timeline":[{"year":"tahun","event":"kejadian penting"}],"references":["sumber atau tokoh kunci"]}`,
    },
  ]

  // Sama gejalanya kayak lib/ai/scenes.ts, director.ts, outline.ts — AI kadang balikin JSON valid
  // diikuti teks nyasar. Retry 3x sebelum nyerah.
  const maxAttempts = 3
  let lastErr: Error | null = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const content = await chat(messages, true)
    try {
      let cleaned = content.trim()
      const startCurly = cleaned.indexOf('{')
      const endCurly = cleaned.lastIndexOf('}')
      if (startCurly !== -1 && endCurly !== -1 && endCurly > startCurly) {
        cleaned = cleaned.substring(startCurly, endCurly + 1)
      }
      return JSON.parse(cleaned) as ResearchOutput
    } catch (err) {
      lastErr = err as Error
      console.error(`Gagal mem-parse research JSON (attempt ${attempt}/${maxAttempts}). Konten asli:`, content)
    }
  }
  throw new Error(`Format JSON Research dari AI tidak valid setelah ${maxAttempts}x percobaan: ${lastErr?.message}`)
}
