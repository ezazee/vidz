const fs = require('fs/promises')

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchPexelsVideoForScene(scene, apiKey) {
  if (!scene.pexels_query) return

  try {
    console.log(`Searching Pexels for scene ${scene.order_index + 1}: "${scene.pexels_query}"...`)
    const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(scene.pexels_query)}&per_page=3&orientation=landscape`, {
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
      // Pick the first video
      const video = data.videos[0]
      // Find an HD quality file (1080p if possible, fallback to 720p)
      const hdFile = video.video_files.find(f => f.width >= 1920) || video.video_files.find(f => f.width >= 1280) || video.video_files[0]
      
      if (hdFile && hdFile.link) {
        scene.pexels_video_url = hdFile.link
        console.log(`✓ Found Pexels video for scene ${scene.order_index + 1}: ${hdFile.link.substring(0, 50)}...`)
      }
    } else {
      console.log(`No Pexels video found for "${scene.pexels_query}". Falling back to AI image later.`)
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

  const storyboardPath = 'storyboard.json'
  let storyboardData
  try {
    storyboardData = JSON.parse(await fs.readFile(storyboardPath, 'utf8'))
  } catch (e) {
    console.error('storyboard.json not found, skipping Pexels.')
    return
  }

  const scenes = storyboardData.storyboard.scenes

  // Process in small batches to avoid rate limits (Pexels limit is generous but good practice)
  const batchSize = 5
  for (let i = 0; i < scenes.length; i += batchSize) {
    const batch = scenes.slice(i, i + batchSize)
    await Promise.all(batch.map(scene => fetchPexelsVideoForScene(scene, pexelsApiKey)))
    if (i + batchSize < scenes.length) await delay(1000)
  }

  await fs.writeFile(storyboardPath, JSON.stringify(storyboardData, null, 2))
  console.log('Finished checking Pexels API.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
