import { env } from '@/lib/env'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chat(messages: Message[], json = true): Promise<string> {
  const baseUrl = env.AI_BASE_URL ?? env.NINE_ROUTER_BASE_URL
  const apiKey = env.AI_API_KEY ?? env.NINE_ROUTER_API_KEY
  const model = env.AI_MODEL

  if (!baseUrl || !apiKey || !model) throw new Error('AI_BASE_URL, AI_API_KEY, and AI_MODEL are required')

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      ...(json && { response_format: { type: 'json_object' } }),
    }),
  })

  if (!res.ok) throw new Error(`AI request failed: ${res.status} ${res.statusText}`)

  const data = await res.json()
  return data.choices[0].message.content
}
