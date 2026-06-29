import { NextResponse } from 'next/server'
import { uploadToR2 } from '@/lib/r2'
import { chat } from '@/lib/ai/client'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const baseUrl = process.env.AI_BASE_URL
  const apiKey = process.env.AI_API_KEY
  const modelName = process.env.IMAGE_MODEL || 'cf/@cf/stabilityai/stable-diffusion-xl-base-1.0'

  if (!baseUrl || !apiKey) {
    return NextResponse.json({ error: 'Kredensial AI belum lengkap.' }, { status: 500 })
  }

  const body = await request.json()
  const { prompt } = body
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Prompt diperlukan' }, { status: 400 })
  }

  try {
    // Run text AI and image generation in parallel
    const [textResult, imageRes] = await Promise.all([
      chat([
        { role: 'system', content: `YouTube Thumbnail Strategist. Output ONLY a raw JSON object, no markdown:\n{"imagePrompt":"cinematic English image prompt","textLeft":"2-3 kata Indonesia clickbait","textRight":"2-3 kata Indonesia clickbait","textBottom":"3-4 kata Indonesia banner"}` },
        { role: 'user', content: prompt }
      ], false, 'gemini-flash-grade').then(result => {
        const start = result.indexOf('{'), end = result.lastIndexOf('}')
        if (start === -1 || end <= start) return null
        return JSON.parse(result.substring(start, end + 1))
      }).catch(() => null),

      fetch(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName, prompt, n: 1, size: '1792x1024', response_format: 'url' }),
      })
    ])

    if (!imageRes.ok) {
      const err = await imageRes.text().catch(() => '')
      throw new Error(`Image generation failed: ${imageRes.status}. ${err}`)
    }

    const data = await imageRes.json()
    let buffer: Buffer

    if (data.data?.[0]?.b64_json) {
      buffer = Buffer.from(data.data[0].b64_json, 'base64')
    } else if (data.data?.[0]?.url) {
      const imgRes = await fetch(data.data[0].url)
      buffer = Buffer.from(await imgRes.arrayBuffer())
    } else {
      throw new Error('Tidak ada data gambar dari API.')
    }

    const r2Url = await uploadToR2(`projects/${id}/thumbnails/raw-${Date.now()}.jpg`, buffer, 'image/jpeg')

    return NextResponse.json({
      success: true,
      imageUrl: r2Url,
      textLeft: textResult?.textLeft?.toUpperCase() || '',
      textRight: textResult?.textRight?.toUpperCase() || '',
      textBottom: textResult?.textBottom?.toUpperCase() || '',
    })
  } catch (error) {
    console.error('Error generating thumbnail:', error)
    return NextResponse.json({ error: `Gagal: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 })
  }
}
