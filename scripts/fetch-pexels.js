const fs = require('fs/promises')

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchPexelsForScene(scene, apiKey) {
  if (!scene.pexels_query) {
    console.log(`Scene ${scene.order_index + 1}: no pexels_query → AI image only`)
    return
  }

  try {
    console.log(`Scene ${scene.order_index + 1}: Pexels "${scene.pexels_query}"...`)

    // Fetch video dan foto secara paralel
    const [videoRes, photoRes] = await Promise.all([
      fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(scene.pexels_query)}&per_page=10&orientation=landscape`, {
        headers: { Authorization: apiKey }
      }),
      fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(scene.pexels_query)}&per_page=5&orientation=landscape`, {
        headers: { Authorization: apiKey }
      })
    ])

    // Video
    if (videoRes.ok) {
      const videoData = await videoRes.json()
      if (videoData.videos?.length > 0) {
        scene.pexels_video_urls = []
        for (const video of videoData.videos) {
          if (scene.pexels_video_urls.length >= 3) break
          const hdFile = video.video_files.find(f => f.width >= 1920)
            || video.video_files.find(f => f.width >= 1280)
            || video.video_files[0]
          if (hdFile?.link) scene.pexels_video_urls.push(hdFile.link)
        }
        console.log(`  ✓ ${scene.pexels_video_urls.length} Pexels videos`)
      }
    }

    // Foto (sebagai asset still ke-2, fallback jika AI image gagal)
    if (photoRes.ok) {
      const photoData = await photoRes.json()
      if (photoData.photos?.length > 0) {
        // Ambil foto paling relevan (src.large2x = 1920px)
        scene.pexels_photo_url = photoData.photos[0].src.large2x || photoData.photos[0].src.large
        console.log(`  ✓ Pexels photo: ${scene.pexels_photo_url.slice(0, 60)}...`)
      }
    }

  } catch (err) {
    console.error(`Pexels error scene ${scene.order_index + 1}: ${err.message}`)
  }
}

async function main() {
  const pexelsApiKey = process.env.PEXELS_API_KEY
  if (!pexelsApiKey) {
    console.log('PEXELS_API_KEY not set — skipping Pexels')
    return
  }

  const storyboardPath = 'storyboard.json'
  let storyboardData
  try {
    storyboardData = JSON.parse(await fs.readFile(storyboardPath, 'utf8'))
  } catch {
    console.error('storyboard.json not found')
    return
  }

  const scenes = storyboardData.storyboard.scenes

  // Batch 3 — Pexels rate limit 200 req/hour
  const batchSize = 3
  for (let i = 0; i < scenes.length; i += batchSize) {
    const batch = scenes.slice(i, i + batchSize)
    await Promise.all(batch.map(scene => fetchPexelsForScene(scene, pexelsApiKey)))
    if (i + batchSize < scenes.length) await delay(1200)
  }

  await fs.writeFile(storyboardPath, JSON.stringify(storyboardData, null, 2))

  const videoCount = scenes.filter(s => s.pexels_video_urls?.length > 0).length
  const photoCount = scenes.filter(s => s.pexels_photo_url).length
  console.log(`\nPexels: ${videoCount} scenes punya video, ${photoCount} punya foto`)
  console.log(`AI image akan generate untuk semua ${scenes.length} scenes`)
}

main().catch(e => { console.error(e); process.exit(1) })
