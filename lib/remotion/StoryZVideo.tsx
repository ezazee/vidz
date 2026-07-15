import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import type { SceneJSON, StoryboardJSON } from '../pipeline/types'
import { storyboardFixture } from './storyboard-fixture'

interface SceneProps {
  scene: SceneJSON
}

// Slow, organic Ken Burns — cocok untuk ilustrasi kartun statis
function SceneImage({ scene }: SceneProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const durationInFrames = Math.max(1, Math.round(scene.duration * fps))

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.33, 1, 0.68, 1), // easeOutCubic
  })

  // Gentle zoom & pan untuk menghidupkan ilustrasi statis
  const baseScale = scene.camera === 'zoom_in' ? 1.02 + progress * 0.09 : 1.12 - progress * 0.07
  const baseTranslateX =
    scene.camera === 'pan_left' ? -40 * progress : scene.camera === 'pan_right' ? 40 * progress : 0
  const baseTranslateY =
    scene.camera === 'tilt_up' ? -25 * progress : scene.camera === 'tilt_down' ? 25 * progress : 0

  // Sedikit gerakan organik biar tidak kaku
  const swayX = Math.sin(frame * 0.05) * 1.0
  const swayY = Math.cos(frame * 0.04) * 1.0

  const scale = baseScale + 0.01
  const translateX = baseTranslateX + swayX
  const translateY = baseTranslateY + swayY

  if (!scene.image_url) {
    return (
      <AbsoluteFill style={{ background: 'linear-gradient(135deg, #fdf6e3, #f5e6c8)' }} />
    )
  }

  const useLocalAssets = process.env.REMOTION_LOCAL_ASSETS === 'true'
  const imageSrc = useLocalAssets
    ? staticFile(`images/scene-${scene.order_index}.jpg`)
    : (scene.image_url.startsWith('http') ? scene.image_url : staticFile(scene.image_url))

  return (
    <Img
      src={imageSrc}
      style={{
        height: '100%',
        objectFit: 'cover',
        transform: `scale(${scale}) translateX(${translateX}px) translateY(${translateY}px)`,
        width: '100%',
      }}
    />
  )
}

function SceneSubtitle({ scene }: SceneProps) {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const isVertical = height > width

  const text = (scene.narration || scene.subtitle || '').trim()
  if (!text) return null

  // Ukuran/posisi proporsional ke resolusi komposisi, bukan hardcode 1920x1080 —
  // biar 1 komponen dipakai untuk video panjang (16:9) maupun short (9:16) tanpa duplikasi.
  // Short: font lebih besar (nonton HP dari dekat) + margin bawah lebih lega (hindari
  // ketutup UI Reels/Shorts platform, biasanya ~15-20% tinggi layar).
  const fontSize = isVertical ? width * 0.075 : width * 0.028
  const sideMargin = width * 0.0625
  const bottomMargin = isVertical ? height * 0.18 : height * 0.093

  const words = text.split(' ')

  // Group words into chunks of 6 for 1-line dynamic display
  const wordsPerChunk = 6
  const chunks: string[][] = []
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk))
  }

  const totalFrames = Math.max(1, Math.round(scene.duration * fps))
  const durationPerChunk = Math.max(1, totalFrames / chunks.length)

  const activeChunkIndex = Math.floor(frame / durationPerChunk)

  if (activeChunkIndex >= chunks.length) return null

  const activeChunk = chunks[activeChunkIndex]

  return (
    <div
      style={{
        alignSelf: 'center',
        bottom: bottomMargin,
        color: '#ffffff',
        fontFamily: "'Trebuchet MS', 'Verdana', 'Arial Rounded MT Bold', sans-serif",
        fontSize,
        fontWeight: 800,
        left: sideMargin,
        lineHeight: 1.3,
        maxWidth: width - sideMargin * 2,
        position: 'absolute',
        right: sideMargin,
        textAlign: 'center',
        textShadow: '3px 3px 0px rgba(0, 0, 0, 0.85), 0px 4px 16px rgba(0, 0, 0, 0.5)',
        letterSpacing: '0.2px',
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}
    >
      {activeChunk.map((word, index) => {
        // Highlight kata kunci: angka, kata kapital, atau kata panjang
        const isNumeric = /\d/.test(word)
        const isCapitalized = index > 0 && /^[A-Z]/.test(word.replace(/['"“]/g, ''))
        const isHighlight = isNumeric || isCapitalized || word.length > 8
        const color = isHighlight ? '#ffd23f' : '#ffffff'

        return (
          <span
            key={`${activeChunkIndex}-${index}`}
            style={{
              color,
              display: 'inline-block',
              marginRight: '14px',
            }}
          >
            {word}
          </span>
        )
      })}
    </div>
  )
}

// Soft fade-in antar scene
function SceneTransition() {
  const frame = useCurrentFrame()

  const overlayOpacity = interpolate(frame, [0, 12], [1, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.ease,
  })

  if (overlayOpacity <= 0) return null

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#fdf6e3', // warm paper tone, match gaya ilustrasi
        opacity: overlayOpacity,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  )
}

function StoryScene({ scene }: SceneProps) {
  return (
    <AbsoluteFill>
      <SceneImage scene={scene} />

      {/* Soft fade transition */}
      <SceneTransition />

      {/* Subtitles */}
      <SceneSubtitle scene={scene} />

      {/* Audio Narration */}
      {scene.voice_url && (
        <Audio
          src={
            process.env.REMOTION_LOCAL_ASSETS === 'true'
              ? staticFile(`voices/scene-${scene.order_index}.mp3`)
              : (scene.voice_url.startsWith('http') ? scene.voice_url : staticFile(scene.voice_url))
          }
        />
      )}
    </AbsoluteFill>
  )
}

// Watermark kecil pojok kanan bawah, sepanjang durasi video — proporsional ke resolusi
// biar konsisten di StoryZVideo (16:9) maupun StoryZVideoShort (9:16).
function Watermark({ url }: { url: string }) {
  const { width, height } = useVideoConfig()
  const size = width * 0.07

  return (
    <Img
      src={url.startsWith('http') ? url : staticFile(url)}
      style={{
        position: 'absolute',
        bottom: height * 0.03,
        right: width * 0.025,
        width: size,
        height: size,
        borderRadius: '50%',
        opacity: 0.85,
        boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
      }}
    />
  )
}

export interface StoryZVideoProps {
  storyboard?: StoryboardJSON
}

export function StoryZVideo({ storyboard = storyboardFixture }: StoryZVideoProps) {
  const { fps } = useVideoConfig()
  let from = 0

  return (
    <AbsoluteFill style={{ backgroundColor: '#fdf6e3' }}>
      {/* Background Music */}
      {storyboard.audio?.background_music_url && (
        <Audio
          src={
            storyboard.audio.background_music_url.startsWith('http')
              ? storyboard.audio.background_music_url
              : staticFile(storyboard.audio.background_music_url)
          }
          volume={storyboard.audio.background_music_volume ?? 0.12}
          loop
        />
      )}
      {/* Sequence Montage */}
      {storyboard.scenes.map((scene) => {
        const durationInFrames = Math.max(1, Math.round(scene.duration * fps))
        const sequence = (
          <Sequence key={scene.id} from={from} durationInFrames={durationInFrames}>
            <StoryScene scene={scene} />
          </Sequence>
        )
        from += durationInFrames
        return sequence
      })}

      {storyboard.watermark_url && <Watermark url={storyboard.watermark_url} />}
    </AbsoluteFill>
  )
}
