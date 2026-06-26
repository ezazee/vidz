const { getAudioDurationInSeconds } = require('@remotion/media-utils')
async function main() {
  console.log('Testing duration...')
  try {
    const dur = await getAudioDurationInSeconds('public/voices/scene-1.mp3')
    console.log('Duration:', dur)
  } catch (e) {
    console.error('Error:', e)
  }
}
main()
