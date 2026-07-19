const fs = require('fs/promises')
const path = require('path')
const { execSync } = require('child_process')
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts')
const { uploadToR2 } = require('./r2-upload')

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Gemini TTS (via 9Router) — dicoba duluan (gratis di tier preview, cepat, kualitas lebih natural
// dari uji lokal). Edge TTS tetap dipertahankan sebagai fallback kalau Gemini gagal/kena limit,
// karena statusnya masih "preview" — Google bisa ubah rate limit/akses kapan saja.
async function genGeminiTTS(text, geminiVoice, geminiLanguage) {
  if (!process.env.AI_BASE_URL || !process.env.AI_API_KEY) return null
  try {
    const res = await fetch(`${process.env.AI_BASE_URL}/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.AI_API_KEY}` },
      body: JSON.stringify({
        model: `gemini/gemini-3.1-flash-tts-preview/${geminiVoice}`,
        input: text,
        language: geminiLanguage,
      }),
    })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

// Satu scene, SATU engine — dipaksa dari luar (bukan pilih sendiri per-scene), supaya satu video
// gak pernah kepotong ganti suara di tengah jalan. Return true kalau berhasil, false kalau engine
// ini gagal buat scene ini (biar caller yang putuskan retry / ganti engine buat SELURUH video).
async function generateVoiceAudio(scene, engine, voice, geminiVoice, geminiLanguage) {
  const finalPath = `public/voices/scene-${scene.order_index}.mp3`

  if (engine === 'gemini') {
    const geminiWav = await genGeminiTTS(scene.narration, geminiVoice, geminiLanguage)
    if (!geminiWav) return false
    const tmpWav = `public/voices/tmp-${scene.order_index}.wav`
    await fs.writeFile(tmpWav, geminiWav)
    execSync(`ffmpeg -y -loglevel error -i "${tmpWav}" -codec:a libmp3lame -qscale:a 2 "${finalPath}"`)
    await fs.rm(tmpWav)
    return true
  }

  // engine === 'edge'
  const tts = new MsEdgeTTS()
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
  const tmpDir = `public/voices/tmp-${scene.order_index}`
  await fs.mkdir(tmpDir, { recursive: true })
  await tts.toFile(tmpDir, scene.narration)
  await fs.rename(`${tmpDir}/audio.mp3`, finalPath)
  await fs.rm(tmpDir, { recursive: true })
  return true
}

async function generateVoiceForScene(scene, engine, voice, apiBaseUrl, apiSecret, projectId, geminiVoice, geminiLanguage) {
  if (!scene.narration) return true
  const maxRetries = 3
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      console.log(`Generating voice for scene ${scene.order_index + 1} via ${engine} (Attempt ${attempt + 1}/${maxRetries})...`)

      const finalPath = `public/voices/scene-${scene.order_index}.mp3`
      const ok = await generateVoiceAudio(scene, engine, voice, geminiVoice, geminiLanguage)
      if (!ok) throw new Error(`${engine} TTS gagal (no audio)`)

      // 1. Unggah berkas audio ke MinIO jika kredensial tersedia
      let publicPath = `voices/scene-${scene.order_index}.mp3`
      if (process.env.MINIO_ACCESS_KEY) {
        try {
          console.log(`Uploading voice for scene ${scene.order_index + 1} to MinIO...`)
          const audioBuffer = await fs.readFile(finalPath)
          const r2Filename = `projects/${projectId}/voices/scene-${scene.order_index}.mp3`
          const r2Url = await uploadToR2(r2Filename, audioBuffer, 'audio/mpeg')
          publicPath = r2Url
          console.log(`Uploaded voice to R2: ${publicPath}`)
        } catch (uploadErr) {
          console.error(`Failed to upload scene ${scene.order_index + 1} voice to MinIO: ${uploadErr.message}. Using local path fallback.`)
        }
      }

      // 2. Hitung durasi suara audio secara dinamis menggunakan ffprobe
      let duration = 10 // default fallback
      try {
        const output = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalPath}"`)
        const exactDuration = parseFloat(output.toString().trim())
        if (!isNaN(exactDuration) && exactDuration > 0) {
          // Tambahkan sedikit buffer (0.4 detik) agar kata terakhir dan transisi tidak terpotong tiba-tiba
          duration = parseFloat((exactDuration + 1.0).toFixed(2))
          console.log(`✓ Calculated voice duration for scene ${scene.order_index + 1}: ${duration}s`)
        } else {
          throw new Error('ffprobe returned invalid number')
        }
      } catch (durationErr) {
        console.error(`Failed to calculate audio duration for scene ${scene.order_index + 1}: ${durationErr.message}. Fallback to 10s.`)
      }

      // 3. Update scene in storyboard json
      scene.voice_url = publicPath
      scene.duration = duration

      // 4. Update database via new unified PATCH API
      if (apiBaseUrl && apiSecret && projectId) {
        const updateUrl = `${apiBaseUrl}/api/projects/${projectId}/scenes/${scene.id}`
        console.log(`Updating DB for scene ${scene.order_index + 1} voice & duration...`)
        const patchRes = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-api-secret': apiSecret,
            ...(process.env.CHANNEL_ID ? { 'x-channel-id': process.env.CHANNEL_ID } : {}),
          },
          body: JSON.stringify({
            voice_url: publicPath, 
            voice_status: 'completed',
            duration: duration
          }),
        })
        if (!patchRes.ok) {
          console.error(`Failed to update DB for scene ${scene.order_index + 1} voice: ${patchRes.status} ${patchRes.statusText}`)
        }
      }

      console.log(`Scene ${scene.order_index + 1} voice done.`)
      return true
    } catch (e) {
      console.error(`Failed voice for scene ${scene.order_index + 1} via ${engine} on attempt ${attempt + 1}:`, e.message)
      attempt++
      if (attempt < maxRetries) {
        console.log(`Waiting 2 seconds before retrying voice for scene ${scene.order_index + 1}...`)
        await delay(2000)
      }
    }
  }

  console.error(`Scene ${scene.order_index + 1} voice failed via ${engine} after ${maxRetries} attempts.`)
  return false
}

async function main() {
  const storyboard = JSON.parse(await fs.readFile('storyboard.json', 'utf8')).storyboard
  // Voice per-channel menang duluan (supaya .env TTS_VOICE global — dipakai channel default —
  // tidak ke-override paksa ke channel lain). TTS_VOICE cuma fallback untuk channel default.
  const CHANNEL_VOICE = { brainwhy: 'en-US-GuyNeural' }
  const voice = CHANNEL_VOICE[process.env.CHANNEL_ID] || process.env.TTS_VOICE || 'id-ID-ArdiNeural'
  // Gemini TTS voice sama (Zephyr) untuk kedua channel — tervalidasi bagus di ID & EN.
  // Bahasa mengikuti channel (dipakai Gemini buat pengucapan yang benar).
  const geminiVoice = 'Charon'
  const CHANNEL_GEMINI_LANG = { brainwhy: 'English' }
  const geminiLanguage = CHANNEL_GEMINI_LANG[process.env.CHANNEL_ID] || 'Indonesian'
  const apiSecret = process.env.API_SECRET
  const apiBaseUrl = process.env.API_BASE_URL
  const projectId = process.env.PROJECT_ID

  await fs.mkdir('public/voices', { recursive: true })

  const scenesWithNarration = storyboard.scenes.filter(s => s.narration)
  // Gemini TTS free tier cuma 10 request/~2 menit — batch 3/40s ≈ 1 req/13.3s, di bawah batas
  // aman quota (~12.7s/req). Ini ngatur RATE biar gak kena 429, tapi gak menjamin video panjang
  // gak kehabisan quota di tengah jalan (window geser, bisa ketabrak channel lain jg).
  const batchSize = 3
  const batchDelayMs = 40000

  // Satu video = satu engine. Coba semua scene pakai Gemini dulu (kalau dikonfigurasi); begitu
  // SATU scene aja gagal (retry abis), seluruh video langsung diulang total pakai Edge TTS —
  // supaya gak ada video yang setengah Gemini setengah Edge (kedengaran ganti suara mendadak).
  async function runBatches(engine) {
    const totalBatches = Math.ceil(scenesWithNarration.length / batchSize)
    for (let i = 0; i < scenesWithNarration.length; i += batchSize) {
      const batch = scenesWithNarration.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      console.log(`[${engine}] Processing voice batch ${batchNum}/${totalBatches}...`)
      const results = await Promise.all(
        batch.map(scene => generateVoiceForScene(scene, engine, voice, apiBaseUrl, apiSecret, projectId, geminiVoice, geminiLanguage))
      )
      if (results.includes(false)) return false
      if (batchNum < totalBatches) await delay(batchDelayMs)
    }
    return true
  }

  const geminiConfigured = Boolean(process.env.AI_BASE_URL && process.env.AI_API_KEY)
  let finalEngine = 'edge'
  if (geminiConfigured) {
    console.log(`Mencoba Gemini TTS buat seluruh ${scenesWithNarration.length} scene...`)
    const geminiOk = await runBatches('gemini')
    if (geminiOk) {
      finalEngine = 'gemini'
    } else {
      console.log('Gemini TTS gagal di tengah jalan — ulang SEMUA scene pakai Edge TTS biar suara satu video konsisten.')
    }
  } else {
    console.log('Gemini TTS gak dikonfigurasi (AI_BASE_URL/AI_API_KEY kosong) — langsung pakai Edge TTS.')
  }
  if (finalEngine === 'edge') {
    const edgeOk = await runBatches('edge')
    if (!edgeOk) throw new Error('Edge TTS juga gagal untuk beberapa scene setelah retry — cek koneksi/voice id.')
  }
  console.log(`Voice generation selesai, engine final: ${finalEngine}.`)

  await fs.writeFile('storyboard.json', JSON.stringify({ storyboard }, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
