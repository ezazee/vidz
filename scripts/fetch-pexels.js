const fs = require('fs/promises')

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchPexelsVideoForScene(scene, apiKey) {
  let query = scene.pexels_query
  
  // Fallback for older storyboards without pexels_query: Extract meaningful words from image_prompt
  if (!query && scene.image_prompt) {
    const ignoreWords = ['cinematic', 'shot', 'wide', 'close', 'angle', 'view', 'photorealistic', 'realistic', 'hyperrealistic', 'high', 'resolution', 'detail', 'detailed', 'photography', 'photo', 'camera', 'lens', 'style', 'lighting', 'background', 'foreground', 'with', 'that', 'this']
    const words = scene.image_prompt.toLowerCase().replace(/[^\w\s]/g, '').split(' ')
      .filter(w => w.length > 3 && !ignoreWords.includes(w))
    
    // Ambil 2 kata pertama yang bukan kata teknis kamera
    query = words.slice(0, 2).join(' ')
  }

  if (!query) return

  try {
    console.log(`Searching Pexels for scene ${scene.order_index + 1}: "${query}"...`)
    const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`, {
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
        if (scene.pexels_video_urls.length >= 3) break // We only need up to 3 videos per scene
        
        // Find an HD quality file (1080p if possible, fallback to 720p)
        const hdFile = video.video_files.find(f => f.width >= 1920) || video.video_files.find(f => f.width >= 1280) || video.video_files[0]
        
        if (hdFile && hdFile.link) {
          scene.pexels_video_urls.push(hdFile.link)
        }
      }
      
      if (scene.pexels_video_urls.length > 0) {
        console.log(`✓ Found ${scene.pexels_video_urls.length} Pexels videos for scene ${scene.order_index + 1}`)
      }
    } else {
      console.log(`No Pexels video found for "${query}". Falling back to AI image later.`)
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
