import { env } from '@/lib/env'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chat(messages: Message[], json = true, customModel?: string): Promise<string> {
  const baseUrl = env.AI_BASE_URL ?? env.NINE_ROUTER_BASE_URL
  const apiKey = env.AI_API_KEY ?? env.NINE_ROUTER_API_KEY
  const model = customModel ?? env.AI_MODEL

  if (!baseUrl || !apiKey || !model) throw new Error('AI_BASE_URL, AI_API_KEY, and AI_MODEL are required')

  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
          max_tokens: 16384,
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
        if (attempt < maxRetries) {
          console.warn(`AI rate limited (${res.status}), retry ${attempt}/${maxRetries} in 15s...`)
          await new Promise(r => setTimeout(r, 15000))
          continue
        }
        throw new Error(`AI request failed after ${maxRetries} attempts: ${res.status} ${res.statusText}`)
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
