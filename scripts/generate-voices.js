const fs = require('fs/promises')
const path = require('path')
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts')

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function generateVoiceForScene(scene, voice) {
  if (!scene.narration) return
  const maxRetries = 3
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      console.log(`Generating voice for scene ${scene.order_index + 1} (Attempt ${attempt + 1}/${maxRetries})...`)
      
      // Buat instance MsEdgeTTS baru untuk setiap scene agar aman secara paralel (thread-safe)
      const tts = new MsEdgeTTS()
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)

      const tmpDir = `public/voices/tmp-${scene.order_index}`
      await fs.mkdir(tmpDir, { recursive: true })

      await tts.toFile(tmpDir, scene.narration)

      const finalPath = `public/voices/scene-${scene.order_index}.mp3`
      const publicPath = `voices/scene-${scene.order_index}.mp3`
      await fs.rename(`${tmpDir}/audio.mp3`, finalPath)
      await fs.rm(tmpDir, { recursive: true })

      scene.voice_url = publicPath
      console.log(`Scene ${scene.order_index + 1} voice done.`)
      return // Success!
    } catch (e) {
      console.error(`Failed voice for scene ${scene.order_index + 1} on attempt ${attempt + 1}:`, e.message)
      attempt++
      if (attempt < maxRetries) {
        console.log(`Waiting 2 seconds before retrying voice for scene ${scene.order_index + 1}...`)
        await delay(2000)
      }
    }
  }

  console.error(`Scene ${scene.order_index + 1} voice failed after ${maxRetries} attempts. Continuing...`)
}

async function main() {
  const storyboard = JSON.parse(await fs.readFile('storyboard.json', 'utf8')).storyboard
  const voice = process.env.TTS_VOICE || 'id-ID-ArdiNeural'

  await fs.mkdir('public/voices', { recursive: true })

  // Proses suara dalam kelompok (batch) isi 5 secara paralel
  // Ini menghemat waktu pembuatan audio hingga 80% tanpa memicu kegagalan WebSocket
  const batchSize = 5
  for (let i = 0; i < storyboard.scenes.length; i += batchSize) {
    const batch = storyboard.scenes.slice(i, i + batchSize)
    console.log(`Processing voice batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(storyboard.scenes.length / batchSize)}...`)
    await Promise.all(batch.map(scene => generateVoiceForScene(scene, voice)))
  }

  await fs.writeFile('storyboard.json', JSON.stringify({ storyboard }, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
