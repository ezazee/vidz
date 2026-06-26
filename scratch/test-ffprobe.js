const { execSync } = require('child_process')
function getAudioDurationSync(filePath) {
  try {
    const output = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`)
    return parseFloat(output.toString().trim())
  } catch (e) {
    console.error('Error with ffprobe:', e.message)
    return 10
  }
}
console.log('Duration:', getAudioDurationSync('public/voices/scene-1.mp3'))
