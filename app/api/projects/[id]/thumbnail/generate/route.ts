import { NextResponse } from 'next/server'
import { uploadToR2 } from '@/lib/r2'
import { chat } from '@/lib/ai/client'

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

    console.log(`Generating new AI thumbnail background for project ${id} with base prompt: "${prompt}"...`)

    let enhancedPrompt = prompt
    let generatedTextLeft = ''
    let generatedTextRight = ''
    let generatedTextBottom = ''

    try {
      const enhancePromise = chat([
        { role: 'system', content: `You are an expert YouTube Thumbnail Strategist & Clickbait Master. The user gives you a topic. You must generate 4 things:
1. 'imagePrompt': A highly detailed, cinematic image generation prompt in English (no text). Focus on high contrast, extreme emotions, or shocking visual elements.
2. 'textLeft': A catchy 2-3 word extreme clickbait text for the top left (Indonesian). Use psychological triggers (e.g. "JANGAN TONTON", "RAHASIA GILA").
3. 'textRight': A catchy 2-3 word extreme clickbait text for the top right (Indonesian). Use curiosity gaps (e.g. "TERNYATA PALSU?", "FAKTA MENCEKAM").
4. 'textBottom': A catchy 3-4 word banner text for the bottom (Indonesian).
OUTPUT EXCLUSIVELY A RAW JSON OBJECT with these 4 keys. DO NOT wrap in markdown \`\`\`json. DO NOT add any other text.` },
        { role: 'user', content: prompt }
      ], false, 'gemini-flash-grade') // json=false to prevent model hangs
      
      const timeoutPromise = new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error('LLM Enhance Timeout')), 10000)
      )
      
      const result = await Promise.race([enhancePromise, timeoutPromise])
      if (result) {
        try {
          let cleanStr = result.trim()
          const startCurly = cleanStr.indexOf('{')
          const endCurly = cleanStr.lastIndexOf('}')
          if (startCurly !== -1 && endCurly !== -1 && endCurly > startCurly) {
            cleanStr = cleanStr.substring(startCurly, endCurly + 1)
          }
          
          const parsed = JSON.parse(cleanStr.trim())
          if (parsed.imagePrompt) enhancedPrompt = parsed.imagePrompt
          if (parsed.textLeft) generatedTextLeft = parsed.textLeft.toUpperCase()
          if (parsed.textRight) generatedTextRight = parsed.textRight.toUpperCase()
          if (parsed.textBottom) generatedTextBottom = parsed.textBottom.toUpperCase()
          console.log(`Generated texts: ${generatedTextLeft} | ${generatedTextRight} | ${generatedTextBottom}`)
        } catch (e) {
          console.warn("Failed to parse JSON from LLM, falling back.", result)
        }
      }
    } catch (e) {
      console.warn("Failed to enhance prompt, falling back to original.", e)
    }

    // Call 9Router Image Generation API
    const res = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        prompt: enhancedPrompt,
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
    let buffer: Buffer

    if (data.data?.[0]?.b64_json) {
      buffer = Buffer.from(data.data[0].b64_json, 'base64')
    } else if (data.data?.[0]?.url) {
      const imgRes = await fetch(data.data[0].url)
      buffer = Buffer.from(await imgRes.arrayBuffer())
    } else {
      throw new Error('Tidak ada data gambar (b64_json atau url) yang dikembalikan dari API AI.')
    }

    // Upload to Cloudflare R2
    const filename = `projects/${id}/thumbnails/raw-${Date.now()}.jpg`
    const r2Url = await uploadToR2(filename, buffer, 'image/jpeg')

    return NextResponse.json({ 
      success: true, 
      imageUrl: r2Url,
      textLeft: generatedTextLeft,
      textRight: generatedTextRight,
      textBottom: generatedTextBottom
    })
  } catch (error) {
    console.error('Error generating custom thumbnail image:', error)
    const errMsg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Gagal membuat gambar thumbnail: ${errMsg}` }, { status: 500 })
  }
}
