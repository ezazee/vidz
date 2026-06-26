import { NextResponse } from 'next/server'
import { uploadToR2 } from '@/lib/r2'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  const { id } = await context.params
  const baseUrl = process.env.AI_BASE_URL
  const apiKey = process.env.AI_API_KEY
  const modelName = process.env.IMAGE_MODEL || 'cf/@cf/stabilityai/stable-diffusion-xl-base-1.0'

  if (!baseUrl || !apiKey) {
    return NextResponse.json({ error: 'Kredensial AI untuk generasi gambar belum lengkap di server.' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt gambar diperlukan' }, { status: 400 })
    }

    console.log(`Generating new AI thumbnail background for project ${id} with prompt: "${prompt}"...`)

    // Call 9Router Image Generation API
    const res = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        prompt: prompt,
        n: 1,
        size: '1792x1024',
        response_format: 'url',
      }),
    })

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '')
      throw new Error(`AI Image Generation failed: ${res.status} ${res.statusText}. Detail: ${errorBody}`)
    }

    const data = await res.json()
    const imageUrl = data.data?.[0]?.url

    if (!imageUrl) {
      throw new Error('Tidak ada URL gambar yang dikembalikan dari API AI.')
    }

    // Download the image
    const imgRes = await fetch(imageUrl)
    const buffer = Buffer.from(await imgRes.arrayBuffer())

    // Upload to Cloudflare R2
    const filename = `projects/${id}/thumbnails/raw-${Date.now()}.jpg`
    const r2Url = await uploadToR2(filename, buffer, 'image/jpeg')

    return NextResponse.json({ success: true, imageUrl: r2Url })
  } catch (error) {
    console.error('Error generating custom thumbnail image:', error)
    const errMsg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Gagal membuat gambar thumbnail: ${errMsg}` }, { status: 500 })
  }
}
