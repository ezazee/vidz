const fs = require('fs')
const path = require('path')

// Constants for WAV format
const SAMPLE_RATE = 44100
const NUM_CHANNELS = 1
const BITS_PER_SAMPLE = 16
const BYTE_RATE = (SAMPLE_RATE * NUM_CHANNELS * BITS_PER_SAMPLE) / 8
const BLOCK_ALIGN = (NUM_CHANNELS * BITS_PER_SAMPLE) / 8
const DURATION_SEC = 20 // 20 seconds is enough for a seamless loop
const NUM_SAMPLES = SAMPLE_RATE * DURATION_SEC

function writeWavHeader(buffer, dataLength) {
  // RIFF chunk descriptor
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataLength, 4)
  buffer.write('WAVE', 8)
  
  // fmt sub-chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // Subchunk1Size
  buffer.writeUInt16LE(1, 20)  // AudioFormat (PCM)
  buffer.writeUInt16LE(NUM_CHANNELS, 22)
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(BYTE_RATE, 28)
  buffer.writeUInt16LE(BLOCK_ALIGN, 32)
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34)
  
  // data sub-chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataLength, 40)
}

function generateWav(filename, generateSampleFn) {
  const dataLength = NUM_SAMPLES * (BITS_PER_SAMPLE / 8)
  const buffer = Buffer.alloc(44 + dataLength)
  
  writeWavHeader(buffer, dataLength)
  
  let offset = 44
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE
    // generateSampleFn should return a value between -1.0 and 1.0
    let sample = generateSampleFn(t, i)
    
    // Apply a simple fade-in and fade-out so the loop is seamless
    const fadeDuration = 1.0 // 1 second fade
    if (t < fadeDuration) {
      sample *= (t / fadeDuration)
    } else if (t > DURATION_SEC - fadeDuration) {
      sample *= ((DURATION_SEC - t) / fadeDuration)
    }

    // Convert to 16-bit PCM integer
    let intSample = Math.max(-1, Math.min(1, sample)) * 32767
    buffer.writeInt16LE(intSample, offset)
    offset += 2
  }
  
  const filepath = path.join(__dirname, '../public/audio', filename)
  fs.writeFileSync(filepath, buffer)
  console.log(`Generated: ${filename}`)
}

// 1. warm-light.wav (Epic/Calm - C Major Drone)
generateWav('warm-light.wav', (t) => {
  const f1 = 130.81 // C3
  const f2 = 164.81 // E3
  const f3 = 196.00 // G3
  
  const s1 = Math.sin(2 * Math.PI * f1 * t)
  const s2 = Math.sin(2 * Math.PI * f2 * t)
  const s3 = Math.sin(2 * Math.PI * f3 * t)
  
  // Slow LFO for organic feel
  const lfo = (Math.sin(2 * Math.PI * 0.1 * t) + 1) / 2
  
  return ((s1 + s2 * 0.5 + s3 * 0.5) / 2.0) * (0.3 + 0.7 * lfo)
})

// 2. unsolved-mystery.wav (Mystery - Detuned Low D Drone)
generateWav('unsolved-mystery.wav', (t) => {
  const f1 = 73.42 // D2
  const f2 = 74.00 // Detuned D2
  
  const s1 = Math.sin(2 * Math.PI * f1 * t)
  const s2 = Math.sin(2 * Math.PI * f2 * t)
  
  const lfo = (Math.sin(2 * Math.PI * 0.05 * t) + 1) / 2
  
  return ((s1 + s2) / 2.0) * (0.5 + 0.5 * lfo)
})

// 3. light-in-the-darkness.wav (Sci-Fi - High evolving ambient)
generateWav('light-in-the-darkness.wav', (t) => {
  const baseFreq = 220.0 // A3
  const harmonic1 = baseFreq * 1.5 // E4
  const harmonic2 = baseFreq * 2.0 // A4
  
  // Pitch modulation
  const mod = Math.sin(2 * Math.PI * 0.2 * t) * 5.0 
  
  const s1 = Math.sin(2 * Math.PI * (baseFreq + mod) * t)
  const s2 = Math.sin(2 * Math.PI * harmonic1 * t)
  const s3 = Math.sin(2 * Math.PI * harmonic2 * t)
  
  return ((s1 + s2 * 0.6 + s3 * 0.3) / 1.9) * 0.8
})

// 4. rain-and-tears.wav (Sad/Tragedy - Brown Noise resembling wind/rain)
let lastOut = 0
generateWav('rain-and-tears.wav', () => {
  const white = Math.random() * 2 - 1
  // Simple low-pass filter to generate brown noise
  const output = (lastOut + (0.02 * white)) / 1.02
  lastOut = output
  return output * 3.5 // Boost volume a bit
})

console.log("All ambient procedural audio files generated successfully!")
