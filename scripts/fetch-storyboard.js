const fs = require('node:fs/promises')

async function main() {
  const baseUrl = process.env.API_BASE_URL
  const projectId = process.env.PROJECT_ID
  const apiSecret = process.env.API_SECRET

  if (!baseUrl || !projectId || !apiSecret) {
    throw new Error('API_BASE_URL, PROJECT_ID, and API_SECRET are required')
  }

  const runId = process.env.GITHUB_RUN_ID
  const sceneIds = process.env.SCENE_IDS
  const params = new URLSearchParams()
  if (runId) params.set('run_id', runId)
  if (sceneIds) params.set('scene_ids', sceneIds)
  const qs = params.toString()
  const url = `${baseUrl}/api/projects/${projectId}/storyboard${qs ? `?${qs}` : ''}`

  const response = await fetch(url, {
    headers: {
      'x-api-secret': apiSecret,
      ...(process.env.CHANNEL_ID ? { 'x-channel-id': process.env.CHANNEL_ID } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch storyboard: ${response.status} ${response.statusText}`)
  }

  const payload = await response.json()
  await fs.writeFile('storyboard.json', JSON.stringify({ storyboard: payload.storyboard }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
