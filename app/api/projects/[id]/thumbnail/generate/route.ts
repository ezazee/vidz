import { NextResponse } from 'next/server'
import { uploadToR2 } from '@/lib/r2'
import { chat } from '@/lib/ai/client'
import { composeThumbnail, THUMBNAIL_BG_STYLE, SAFETY_NEGATIVE_PROMPT } from '@/lib/thumbnail'

interface RouteContext {
  params: Promise<{ id: string }>
}

async function generateBg(baseUrl: string, apiKey: string, model: string, scene: string): Promise<Buffer | null> {
  try {
    const res = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: `${THUMBNAIL_BG_STYLE}. Scene: ${scene}. Keep background plain — avoid wall posters, flags, or decorative insignia. no realistic humans. ${SAFETY_NEGATIVE_PROMPT}`,
        n: 1,
        size: '1792x1024',
        response_format: 'url',
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.data?.[0]?.b64_json) return Buffer.from(data.data[0].b64_json, 'base64')
    if (data.data?.[0]?.url) {
      const imgRes = await fetch(data.data[0].url)
      if (imgRes.ok) return Buffer.from(await imgRes.arrayBuffer())
    }
    return null
  } catch {
    return null
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const baseUrl = process.env.AI_BASE_URL
  const apiKey = process.env.AI_API_KEY
  const modelName = process.env.IMAGE_MODEL || 'cf/@cf/black-forest-labs/flux-1-schnell'

  if (!baseUrl || !apiKey) {
    return NextResponse.json({ error: 'Kredensial AI belum lengkap.' }, { status: 500 })
  }

  const body = await request.json()
  const { prompt } = body
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Prompt diperlukan' }, { status: 400 })
  }

  try {
    // 1. AI: judul pendek + 2 deskripsi scene (dunia asli vs skenario alternatif)
    const textResult = await chat([
      { role: 'system', content: `Output ONLY raw JSON, no markdown:\n{"title":"judul thumbnail Indonesia 3-7 kata punchy, diawali JIKA untuk topik what-if","sceneLeft":"English: the REAL history scene (what actually happened), MUST be dark gloomy grim ruins/war/oppression mood, environment only, no people, 12-20 words","sceneRight":"English: the ALTERNATE what-if scenario, MUST be the OPPOSITE mood — golden glorious prosperous futuristic, VISUALLY VERY DIFFERENT from sceneLeft (different buildings, colors, era), environment only, no people, 12-20 words"}` },
      { role: 'user', content: prompt }
    ], false, 'gemini-flash-grade').then(result => {
      const start = result.indexOf('{'), end = result.lastIndexOf('}')
      if (start === -1 || end <= start) return null
      return JSON.parse(result.substring(start, end + 1))
    }).catch(() => null)

    const sceneLeft = textResult?.sceneLeft || `the real historical events of ${prompt}, dark gloomy grim atmosphere, ruins and smoke, muted colors`
    const sceneRight = textResult?.sceneRight || `epic alternate reality of ${prompt}, golden glorious prosperous city, bright vivid colors, triumphant atmosphere`

    // 2. Generate 2 background paralel
    const [bgLeft, bgRight] = await Promise.all([
      generateBg(baseUrl, apiKey, modelName, sceneLeft),
      generateBg(baseUrl, apiKey, modelName, sceneRight),
    ])

    if (!bgLeft && !bgRight) throw new Error('Kedua background gagal digenerate.')

    // 3. Compose template split-screen
    const finalBuffer = await composeThumbnail({
      bgLeft: (bgLeft ?? bgRight)!,
      bgRight: bgRight ?? undefined,
      title: textResult?.title || prompt,
    })

    const r2Url = await uploadToR2(`projects/${id}/thumbnails/raw-${Date.now()}.jpg`, finalBuffer, 'image/jpeg')

    // Teks kosong: thumbnail sudah final ter-compose, client tidak perlu overlay lagi
    return NextResponse.json({
      success: true,
      imageUrl: r2Url,
      textLeft: '',
      textRight: '',
      textBottom: '',
    })
  } catch (error) {
    console.error('Error generating thumbnail:', error)
    return NextResponse.json({ error: `Gagal: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 })
  }
}

export const maxDuration = 300
