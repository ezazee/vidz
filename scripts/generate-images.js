const fs = require('fs/promises')

async function main() {
  const storyboard = JSON.parse(await fs.readFile('storyboard.json', 'utf8')).storyboard
  const baseUrl = process.env.AI_BASE_URL
  const apiKey = process.env.AI_API_KEY
  const apiSecret = process.env.API_SECRET
  const apiBaseUrl = process.env.API_BASE_URL
  const projectId = process.env.PROJECT_ID

  if (!baseUrl || !apiKey) throw new Error('AI_BASE_URL and AI_API_KEY required')

  await fs.mkdir('output/images', { recursive: true })

  for (const scene of storyboard.scenes) {
    console.log(`Generating image for scene ${scene.order_index + 1}...`)

    const res = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: scene.image_prompt,
        n: 1,
        size: '1792x1024',
        response_format: 'url',
      }),
    })

    if (!res.ok) {
      console.error(`Failed scene ${scene.order_index + 1}: ${res.status} ${res.statusText}`)
      continue
    }

    const data = await res.json()
    const imageUrl = data.data?.[0]?.url
    if (!imageUrl) { console.error(`No URL for scene ${scene.order_index + 1}`); continue }

    // download image
    const imgRes = await fetch(imageUrl)
    const buffer = Buffer.from(await imgRes.arrayBuffer())
    const localPath = `output/images/scene-${scene.order_index}.jpg`
    await fs.writeFile(localPath, buffer)

    // update scene in storyboard json
    scene.image_url = localPath

    // update DB via API
    if (apiBaseUrl && apiSecret && projectId) {
      await fetch(`${apiBaseUrl}/api/projects/${projectId}/scenes/${scene.id}/image`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-api-secret': apiSecret },
        body: JSON.stringify({ image_url: localPath, image_status: 'completed' }),
      }).catch(() => {})
    }

    console.log(`Scene ${scene.order_index + 1} image done.`)
  }

  // write updated storyboard
  await fs.writeFile('storyboard.json', JSON.stringify({ storyboard }, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
