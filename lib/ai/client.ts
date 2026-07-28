import { env } from '@/lib/env'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// Satu run pipeline manggil chat() ~15-16 kali beruntun (research, director, outline,
// per-section scenes, QA 3 agent x 2 putaran, closing, seo). Kalau ditembak secepat
// mungkin tanpa jeda, itu lebih cepat dari kecepatan pemulihan kuota TPM gateway —
// retry reaktif (lihat blok 429/413 di bawah) jadi percuma karena kuota terus-menerus
// penuh, bukan cuma kena spike sesaat (ciri: "reset after Ns" sama persis tiap retry).
// Jaga jarak proaktif di sini SEBELUM kena limit, bukan cuma nunggu SETELAH kena.
const MIN_CALL_INTERVAL_MS = 4000
let lastCallAt = 0

async function paceCall() {
  const now = Date.now()
  const wait = lastCallAt + MIN_CALL_INTERVAL_MS - now
  lastCallAt = Math.max(now, lastCallAt + MIN_CALL_INTERVAL_MS)
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
}

export async function chat(messages: Message[], json = true, customModel?: string): Promise<string> {
  await paceCall()
  const baseUrl = env.AI_BASE_URL ?? env.NINE_ROUTER_BASE_URL
  const apiKey = env.AI_API_KEY ?? env.NINE_ROUTER_API_KEY
  const model = customModel ?? env.AI_MODEL

  if (!baseUrl || !apiKey || !model) throw new Error('AI_BASE_URL, AI_API_KEY, and AI_MODEL are required')

  const maxRetries = 3
  // Rate-limit (429/413 TPM) dapat jatah percobaan lebih banyak — sekarang delay-nya
  // akurat (baca "reset after Ns" asli, bukan tebakan), jadi menambah percobaan tidak
  // buang waktu percuma. Step berat (Scenes: 1 panggilan per section) paling sering
  // kena karena beruntun dalam waktu singkat.
  const maxRateLimitRetries = 6
  const maxAttempts = Math.max(maxRetries, maxRateLimitRetries)
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    // 180s per attempt: step berat (scenes 6-10 adegan sekaligus) sering lewat 90s,
    // apalagi kalau alias model dirotasi ke model yang lebih lambat.
    const timeoutId = setTimeout(() => controller.abort(), 180000)

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          // PENTING: gateway/Groq menghitung max_tokens SEBAGAI RESERVASI terhadap
          // limit TPM (tokens-per-minute) — bukan cuma token yang beneran kepakai.
          // Org ini punya limit 8000 TPM (dikonfirmasi dari pesan error 413:
          // "Limit 8000, Requested 16511"). Prompt overhead gateway ini sendiri
          // sudah ~2000-3500 token, jadi max_tokens 16384 (nilai lama) SELALU
          // ditolak instan apa pun isi promptnya — bukan soal beban/spike lain.
          // 4096 dipilih supaya prompt terbesar (~3500) + ini tetap di bawah 8000.
          max_tokens: 4096,
          ...(json && { response_format: { type: 'json_object' } }),
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // ponytail: retry on gateway errors (Fly.io cold start)
      if (res.status === 502 || res.status === 503) {
        if (attempt < maxRetries) {
          console.warn(`AI gateway ${res.status}, retry ${attempt}/${maxRetries} in 8s...`)
          await new Promise(r => setTimeout(r, 8000))
          continue
        }
        throw new Error(`AI request failed after ${maxRetries} attempts: ${res.status} ${res.statusText}`)
      }

      // 429 = rate limit standar. 413 juga dipakai gateway ini untuk TPM (tokens-per-minute)
      // terlampaui, bukan cuma "body kegedean" — pesannya sendiri bilang "reset after Ns".
      // Tanpa retry di sini, satu spike traffic langsung mematikan seluruh pipeline.
      if (res.status === 429 || res.status === 413) {
        if (attempt < maxRateLimitRetries) {
          // Gateway selalu menempelkan "(reset after Ns)" di pesan error — waktu tunggu
          // aktualnya bervariasi 14-30 detik tergantung beban saat itu, jadi pakai angka
          // asli (+buffer 2s) daripada delay tetap yang kadang kepotong sebelum reset.
          const bodyText = await res.text().catch(() => '')
          const match = bodyText.match(/reset after (\d+)s/)
          const waitMs = match ? (Number(match[1]) + 2) * 1000 : 20000
          console.warn(`AI rate limited (${res.status}), retry ${attempt}/${maxRateLimitRetries} in ${waitMs / 1000}s...`)
          await new Promise(r => setTimeout(r, waitMs))
          continue
        }
        throw new Error(`AI request failed after ${maxRateLimitRetries} attempts: ${res.status} ${res.statusText}`)
      }

      if (!res.ok) throw new Error(`AI request failed: ${res.status} ${res.statusText}`)

      const contentType = res.headers.get('content-type') ?? ''

      // beberapa gateway kembalikan SSE meski stream:false — collect semua chunk
      if (contentType.includes('text/event-stream')) {
        const text = await res.text()
        let content = ''
        for (const line of text.split('\n')) {
          if (!line.startsWith('data:')) continue
          const raw = line.slice(5).trim()
          if (raw === '[DONE]') break
          const chunk = JSON.parse(raw)
          content += chunk.choices?.[0]?.delta?.content ?? ''
        }
        return stripMarkdown(content)
      }

      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error(`AI returned empty response: ${JSON.stringify(data)}`)
      return stripMarkdown(content)
    } catch (error) {
      clearTimeout(timeoutId)
      if ((error as any)?.name === 'AbortError') {
        if (attempt < maxRetries) {
          console.warn(`AI fetch aborted (timeout), retry ${attempt}/${maxRetries} in 5s...`)
          await new Promise(r => setTimeout(r, 5000))
          continue
        }
        // Timeout bukan rate-limit (maxRateLimitRetries lebih tinggi dari maxRetries),
        // jadi hentikan di sini walau attempt < maxAttempts.
        throw new Error(`AI fetch aborted after ${maxRetries} attempts (timeout or connection failed). URL: ${baseUrl}/chat/completions`)
      }
      throw error
    }
  }

  throw new Error('AI chat: unreachable')
}

function stripMarkdown(s: unknown): string {
  if (typeof s !== 'string') s = JSON.stringify(s) ?? ''
  let str = s as string
  str = str.replace(/<think>[\s\S]*?<\/think>/gi, '')
  return str.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}
