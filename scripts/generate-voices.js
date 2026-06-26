const fs = require('fs/promises')
const path = require('path')
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts')

async function main() {
  const storyboard = JSON.parse(await fs.readFile('storyboard.json', 'utf8')).storyboard
  const voice = process.env.TTS_VOICE || 'id-ID-ArdiNeural'

  await fs.mkdir('output/voices', { recursive: true })

  const tts = new MsEdgeTTS()
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)

  for (const scene of storyboard.scenes) {
    if (!scene.narration) continue
    console.log(`Generating voice for scene ${scene.order_index + 1}...`)

    const tmpDir = `output/voices/tmp-${scene.order_index}`
    await fs.mkdir(tmpDir, { recursive: true })

    await tts.toFile(tmpDir, scene.narration)

    const finalPath = `output/voices/scene-${scene.order_index}.mp3`
    await fs.rename(`${tmpDir}/audio.mp3`, finalPath)
    await fs.rm(tmpDir, { recursive: true })

    scene.voice_url = finalPath
    console.log(`Scene ${scene.order_index + 1} voice done.`)
  }

  await fs.writeFile('storyboard.json', JSON.stringify({ storyboard }, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
