const fs = require('fs/promises')
const { uploadToR2 } = require('./r2-upload')

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const { mascotOverlay } = require('./mascot')

// Maskot digambar AI langsung DI DALAM scene (FLUX handal soal ini, beda dengan SDXL dulu):
// anchor fisik tetap + kostum kontekstual per topik dari director.character_bible.
// Plus: narator stickman polos (SVG) di-composite ke pojok tiap scene — scripts/mascot.js
const MASCOT_ANCHOR =
  'a simple white stickman character with plain round white head and two black dot eyes'

const CARTOON_STYLE =
  'vibrant colorful hand-drawn cartoon illustration, webcomic style, thick black ink outlines, ' +
  'rich saturated colors, flat cel shading, richly detailed scenery, ' +
  'lively composition, children storybook art'

// #5 Palette per kategori — konsisten dengan lib/ai/variation.ts (CATEGORY_PALETTE)
const CATEGORY_PALETTE = {
  'What-If Sejarah Nusantara': 'warm sepia and gold tones, tropical earthy palette, batik-inspired accents',
  'What-If Sejarah Dunia': 'classic warm amber and parchment tones, vintage muted palette',
  'What-If Tokoh Terkenal': 'dramatic high-contrast portrait lighting, bold red and cream accents',
  'What-If Sains & Teknologi': 'cool blue and teal neon tones, clean futuristic palette',
  'What-If Perang & Konflik': 'desaturated steel grey and ember orange, smoky dramatic palette',
  'What-If Bencana Alam': 'dark stormy purple and ash grey, ominous cinematic palette',
}

function buildImagePrompt(scene, director, category) {
  const action = scene.image_prompt || `witnessing: ${scene.narration?.slice(0, 80)}`
  // prompt_anchor dari director = MASCOT_ANCHOR + kostum era/topik (di-set lib/ai/director.ts)
  const character = director?.character_bible?.characters?.[0]?.prompt_anchor || MASCOT_ANCHOR
  const palette = (category && CATEGORY_PALETTE[category]) ? `, ${CATEGORY_PALETTE[category]}` : ''
  return `${CARTOON_STYLE}${palette}. Main subject: ${character}, ${action}. no text, no watermark, no logo, no photorealism, not monochrome, no swastika, no nazi symbols, no hate symbols`
}

async function generateImageForScene(scene, director, baseUrl, apiKey, apiSecret, apiBaseUrl, projectId, category) {
  // Selalu generate AI image — dipakai sebagai foto still (asset ke-2) bahkan jika ada Pexels video
  console.log(`Scene ${scene.order_index + 1}: Generating AI image...`)

  const modelName = process.env.IMAGE_MODEL || 'cf/@cf/black-forest-labs/flux-1-schnell'
  const prompt = buildImagePrompt(scene, director, category)
  const maxRetries = 3
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      const res = await fetch(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          prompt,
          n: 1,
          size: '1792x1024',
          response_format: 'url',
        }),
      })

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '')
        console.error(`Scene ${scene.order_index + 1} attempt ${attempt + 1} failed: ${res.status} ${errorBody.slice(0, 100)}`)
        attempt++
        if (attempt < maxRetries) await delay(2000)
        continue
      }

      const data = await res.json()
      let buffer
      if (data.data?.[0]?.b64_json) {
        buffer = Buffer.from(data.data[0].b64_json, 'base64')
      } else if (data.data?.[0]?.url) {
        const imgRes = await fetch(data.data[0].url)
        buffer = Buffer.from(await imgRes.arrayBuffer())
      } else {
        console.error(`No image data for scene ${scene.order_index + 1}:`, JSON.stringify(data).slice(0, 200))
        attempt++
        if (attempt < maxRetries) await delay(2000)
        continue
      }

      // Composite narator "Si Cabang" ke pojok (ekspresi ikut emotion scene, sisi bergilir)
      try {
        buffer = await mascotOverlay(buffer, scene.order_index, scene.emotion)
      } catch (overlayErr) {
        console.error(`Narrator overlay failed scene ${scene.order_index + 1}: ${overlayErr.message}. Using raw image.`)
      }

      // Simpan lokal untuk Remotion
      const localPath = `public/images/scene-${scene.order_index}.jpg`
      await fs.writeFile(localPath, buffer)

      // Upload ke MinIO
      let imageUrl = `images/scene-${scene.order_index}.jpg`
      if (process.env.MINIO_ACCESS_KEY) {
        try {
          const r2Filename = `projects/${projectId}/images/scene-${scene.order_index}.jpg`
          imageUrl = await uploadToR2(r2Filename, buffer, 'image/jpeg')
        } catch (uploadErr) {
          console.error(`MinIO upload failed scene ${scene.order_index + 1}: ${uploadErr.message}`)
        }
      }

      scene.image_url = imageUrl

      // Update DB — hanya set image_url jika belum ada Pexels video
      // Kalau ada Pexels, image_url di DB sudah diisi oleh fetch-pexels.js (video url)
      // Kita simpan AI image di field image_url dan Pexels di pexels_video_urls
      if (apiBaseUrl && apiSecret && projectId) {
        const hasPexels = scene.pexels_video_urls && scene.pexels_video_urls.length > 0
        const patchBody = hasPexels
          ? { image_still_url: imageUrl, image_status: 'completed' }
          : { image_url: imageUrl, image_status: 'completed' }

        const patchRes = await fetch(`${apiBaseUrl}/api/projects/${projectId}/scenes/${scene.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-api-secret': apiSecret },
          body: JSON.stringify(patchBody),
        })
        if (!patchRes.ok) {
          console.error(`DB update failed scene ${scene.order_index + 1}: ${patchRes.status}`)
        }
      }

      console.log(`Scene ${scene.order_index + 1}: AI image done → ${imageUrl.slice(0, 60)}...`)
      return
    } catch (e) {
      console.error(`Exception scene ${scene.order_index + 1} attempt ${attempt + 1}: ${e.message}`)
      attempt++
      if (attempt < maxRetries) await delay(2000)
    }
  }

  console.error(`Scene ${scene.order_index + 1}: failed after ${maxRetries} attempts`)
}

async function main() {
  const storyboard = JSON.parse(await fs.readFile('storyboard.json', 'utf8')).storyboard
  const baseUrl = process.env.AI_BASE_URL
  const apiKey = process.env.AI_API_KEY
  const apiSecret = process.env.API_SECRET
  const apiBaseUrl = process.env.API_BASE_URL
  const projectId = process.env.PROJECT_ID

  if (!baseUrl || !apiKey) throw new Error('AI_BASE_URL and AI_API_KEY required')

  await fs.mkdir('public/images', { recursive: true })

  const director = storyboard.director
  const category = storyboard.category || null

  // Batch 4 paralel — SDXL rate limit biasanya ketat
  const batchSize = 4
  for (let i = 0; i < storyboard.scenes.length; i += batchSize) {
    const batch = storyboard.scenes.slice(i, i + batchSize)
    console.log(`Image batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(storyboard.scenes.length / batchSize)}...`)
    await Promise.all(batch.map(scene => generateImageForScene(scene, director, baseUrl, apiKey, apiSecret, apiBaseUrl, projectId, category)))
    if (i + batchSize < storyboard.scenes.length) await delay(500)
  }

  await fs.writeFile('storyboard.json', JSON.stringify({ storyboard }, null, 2))
  const ok = storyboard.scenes.filter(s => s.image_url).length
  console.log(`\nImages: ${ok}/${storyboard.scenes.length} berhasil`)

  // Guard: kalau mayoritas gambar gagal (mis. kuota Cloudflare AI habis),
  // hentikan pipeline — JANGAN render & publish video kosong ke YouTube
  if (ok < storyboard.scenes.length * 0.8) {
    console.error(`FATAL: hanya ${ok}/${storyboard.scenes.length} gambar berhasil (<80%). Render dibatalkan.`)
    process.exit(1)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
