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

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes timeout

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
        max_tokens: 8192,
        ...(json && { response_format: { type: 'json_object' } }),
      }),
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)

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
  return stripMarkdown(data.choices[0].message.content)
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

function stripMarkdown(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}
