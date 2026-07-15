const fs = require('fs/promises')
const { uploadToR2 } = require('./r2-upload')

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const { mascotOverlay } = require('./mascot')

// Maskot digambar AI langsung DI DALAM scene (FLUX handal soal ini, beda dengan SDXL dulu):
// anchor fisik tetap + kostum kontekstual per topik dari director.character_bible.
// Plus: narator stickman polos (SVG) di-composite ke pojok tiap scene — scripts/mascot.js
//
// Channel-aware: nilai di bawah ini fallback default (Cabang Sejarah, backward compatible).
// Channel lain (BrainWhy, Cerita Tetangga, dst) override via CHANNEL_STYLE — HARUS disinkron
// manual dengan lib/channels.ts (file ini plain JS/CommonJS, tidak bisa import langsung dari
// lib/channels.ts yang ESM+TypeScript).
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

const CHANNEL_STYLE = {
  brainwhy: {
    mascotAnchor:
      'a simple stickman character with a round white head, two black dot eyes, a small smile, ' +
      'and an orange/coral brain-shaped icon glowing on top of its head like a lightbulb',
    cartoonStyle:
      'clean modern flat vector illustration, minimal geometric style, thin bold outlines, ' +
      'deep indigo and soft lavender background tones with coral accent highlights, ' +
      'smooth flat shading, uncluttered composition, modern educational explainer art',
    categoryPalette: {
      'Cognitive Biases': 'cool indigo and soft lavender tones, clean analytical palette',
      'Habits & Behavior': 'warm coral and deep navy accents, energetic focused palette',
      'Emotions & Mood': 'muted violet and dusty rose tones, introspective calm palette',
      'Relationships & Social Psychology': 'warm amber and indigo contrast, human connection palette',
      'Sleep & Brain Health': 'deep midnight blue and soft periwinkle, calm nocturnal palette',
      'Dark Psychology & Manipulation': 'high-contrast charcoal and coral red, tense dramatic palette',
    },
  },
  'cerita-tetangga': {
    mascotAnchor:
      'ordinary Indonesian kampung residents in everyday clothing, warm expressive faces — ' +
      'no single fixed narrator character, each scene features whichever character the story is about',
    cartoonStyle:
      'warm hand-drawn cartoon illustration, soft rounded ink outlines, ' +
      'golden-hour and lamplight color grading, cozy kampung storybook art, ' +
      'expressive faces, gentle cel shading',
    categoryPalette: {
      'Drama Keluarga': 'warm amber and soft brown tones, cozy domestic palette',
      'Konflik Tetangga': 'dusty terracotta and muted green, tense neighborhood palette',
      'Kisah Mistis': 'deep indigo and pale moonlight blue, eerie nocturnal palette',
      'Kriminal & Pelajaran Hidup': 'desaturated grey and warm ember accent, sobering palette',
      'Perselingkuhan & Percintaan': 'dusty rose and warm gold, melancholic romantic palette',
      'Kejadian Viral Warga': 'bright golden hour orange and cream, lively kampung palette',
    },
  },
}

function styleFor(channelId) {
  const override = CHANNEL_STYLE[channelId]
  return {
    mascotAnchor: override?.mascotAnchor || MASCOT_ANCHOR,
    cartoonStyle: override?.cartoonStyle || CARTOON_STYLE,
    categoryPalette: override?.categoryPalette || CATEGORY_PALETTE,
  }
}

// Ditemukan (uji lokal BrainWhy): FLUX kadang menyelipkan swastika/simbol kebencian
// sebagai "generic wall poster/insignia" filler di background, bahkan di scene yang
// topiknya tidak berkaitan sejarah/perang sama sekali. Negative prompt lama tidak cukup —
// diperkuat + eksplisit larang elemen dekorasi dinding yang jadi sumber masalahnya.
const SAFETY_NEGATIVE =
  'no text, no watermark, no logo, no signature, no gibberish text, no photorealism, not monochrome, ' +
  'no swastika, no nazi symbols, no hate symbols, no political symbols, no national flags, ' +
  'no religious symbols, no propaganda imagery, no offensive symbols, ' +
  'no wall posters with symbols or insignia, no framed wall art with symbols, no banners with emblems'

function buildImagePrompt(scene, director, category) {
  const style = styleFor(process.env.CHANNEL_ID)
  const action = scene.image_prompt || `witnessing: ${scene.narration?.slice(0, 80)}`
  // prompt_anchor dari director = mascotAnchor + kostum era/topik (di-set lib/ai/director.ts)
  const character = director?.character_bible?.characters?.[0]?.prompt_anchor || style.mascotAnchor
  const palette = (category && style.categoryPalette[category]) ? `, ${style.categoryPalette[category]}` : ''
  // "EXACTLY as described" + "do not redesign" ditambahkan setelah uji lokal menunjukkan FLUX
  // kadang mengganti desain karakter jadi gaya webcomic detail penuh (rambut, wajah realistis)
  // alih-alih anchor stickman sederhana yang diminta.
  return `${style.cartoonStyle}${palette}. Main subject: EXACTLY as described, do not redesign or add extra facial/hair details — ${character}. Action: ${action}. Keep background props plain and generic (plants, furniture, blank windows) — avoid wall posters, flags, or decorative insignia. ${SAFETY_NEGATIVE}`
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
          headers: {
            'Content-Type': 'application/json',
            'x-api-secret': apiSecret,
            ...(process.env.CHANNEL_ID ? { 'x-channel-id': process.env.CHANNEL_ID } : {}),
          },
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
