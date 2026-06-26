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

    const modelName = process.env.IMAGE_MODEL || process.env.AI_IMAGE_MODEL || 'cf/@cf/stabilityai/stable-diffusion-xl-base-1.0'
    const res = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        prompt: scene.image_prompt,
        n: 1,
        size: '1792x1024',
        response_format: 'url',
      }),
    })

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '')
      console.error(`Failed scene ${scene.order_index + 1}: ${res.status} ${res.statusText}. Error: ${errorBody}`)
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
      console.error(`No image data in response for scene ${scene.order_index + 1}:`, JSON.stringify(data))
      continue
    }

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
