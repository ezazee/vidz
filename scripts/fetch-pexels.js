const fs = require('fs/promises')

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchPexelsVideoForScene(scene, apiKey, apiBaseUrl, apiSecret, projectId) {
  // Jika AI sengaja mengosongkan pexels_query, hormati keputusannya.
  // Scene ini akan dibuatkan gambar AI yang akurat oleh generate-images.js
  if (!scene.pexels_query) {
    console.log(`Scene ${scene.order_index + 1}: pexels_query kosong → akan menggunakan AI Image`)
    return
  }

  try {
    console.log(`Scene ${scene.order_index + 1}: Mencari video Pexels "${scene.pexels_query}"...`)
    const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(scene.pexels_query)}&per_page=15&orientation=landscape`, {
      headers: {
        Authorization: apiKey
      }
    })

    if (!res.ok) {
      console.error(`Pexels API failed: ${res.status} ${res.statusText}`)
      return
    }

    const data = await res.json()
    if (data.videos && data.videos.length > 0) {
      scene.pexels_video_urls = []
      
      // Loop through videos and get up to 3 HD links
      for (const video of data.videos) {
        if (scene.pexels_video_urls.length >= 3) break
        
        // Find an HD quality file (1080p if possible, fallback to 720p)
        const hdFile = video.video_files.find(f => f.width >= 1920) || video.video_files.find(f => f.width >= 1280) || video.video_files[0]
        
        if (hdFile && hdFile.link) {
          scene.pexels_video_urls.push(hdFile.link)
        }
      }
      
      if (scene.pexels_video_urls.length > 0) {
        console.log(`✓ Scene ${scene.order_index + 1}: Dapat ${scene.pexels_video_urls.length} video Pexels (B-Roll)`)
        
        // Update database agar UI project bisa menampilkan info Pexels
        if (apiBaseUrl && apiSecret && projectId && scene.id) {
          try {
            const updateUrl = `${apiBaseUrl}/api/projects/${projectId}/scenes/${scene.id}`
            const patchRes = await fetch(updateUrl, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'x-api-secret': apiSecret
              },
              body: JSON.stringify({
                image_url: scene.pexels_video_urls[0],
                image_status: 'completed'
              }),
            })
            if (!patchRes.ok) {
              console.error(`Failed to update DB for scene ${scene.order_index + 1} Pexels: ${patchRes.status}`)
            }
          } catch (dbErr) {
            console.error(`DB update error for scene ${scene.order_index + 1}:`, dbErr.message)
          }
        }
      }
    } else {
      console.log(`Scene ${scene.order_index + 1}: Pexels tidak punya video "${scene.pexels_query}" → fallback ke AI Image`)
    }
  } catch (err) {
    console.error(`Exception during Pexels fetch for scene ${scene.order_index + 1}:`, err.message)
  }
}

async function main() {
  const pexelsApiKey = process.env.PEXELS_API_KEY
  if (!pexelsApiKey) {
    console.log('PEXELS_API_KEY not found in environment. Skipping Pexels stock video fetching.')
    return
  }

  const apiBaseUrl = process.env.API_BASE_URL
  const apiSecret = process.env.API_SECRET
  const projectId = process.env.PROJECT_ID

  const storyboardPath = 'storyboard.json'
  let storyboardData
  try {
    storyboardData = JSON.parse(await fs.readFile(storyboardPath, 'utf8'))
  } catch (e) {
    console.error('storyboard.json not found, skipping Pexels.')
    return
  }

  const scenes = storyboardData.storyboard.scenes

  // Process in small batches to avoid rate limits
  const batchSize = 5
  for (let i = 0; i < scenes.length; i += batchSize) {
    const batch = scenes.slice(i, i + batchSize)
    await Promise.all(batch.map(scene => fetchPexelsVideoForScene(scene, pexelsApiKey, apiBaseUrl, apiSecret, projectId)))
    if (i + batchSize < scenes.length) await delay(1000)
  }

  await fs.writeFile(storyboardPath, JSON.stringify(storyboardData, null, 2))
  
  const pexelsCount = scenes.filter(s => s.pexels_video_urls && s.pexels_video_urls.length > 0).length
  const aiCount = scenes.length - pexelsCount
  console.log(`\n📊 Hasil: ${pexelsCount} scene pakai Pexels Video, ${aiCount} scene akan pakai AI Image`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
