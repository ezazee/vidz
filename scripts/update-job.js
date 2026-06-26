function readArg(name) {
  const prefix = `--${name}=`
  const match = process.argv.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : undefined
}

async function main() {
  const baseUrl = process.env.API_BASE_URL
  const apiSecret = process.env.API_SECRET
  const jobId = process.env.JOB_ID
  const status = readArg('status')
  const videoUrl = readArg('video-url')
  const error = readArg('error')

  if (!baseUrl || !apiSecret || !jobId || !status) {
    throw new Error('API_BASE_URL, API_SECRET, JOB_ID, and --status are required')
  }

  const response = await fetch(`${baseUrl}/api/render-jobs/${jobId}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      'x-api-secret': apiSecret,
    },
    body: JSON.stringify({
      status,
      video_url: videoUrl,
      error,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to update job: ${response.status} ${response.statusText}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
