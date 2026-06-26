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

// 1. Slow, Organic Ken Burns Camera Drift
function SceneImage({ scene }: SceneProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const durationInFrames = Math.max(1, Math.round(scene.duration * fps))

  // Extremely smooth, slow cubic-bezier easing for a professional editorial look
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.33, 1, 0.68, 1), // easeOutCubic
  })

  // Very gentle zoom & subtle pan to simulate camera sliding on a track
  const scale = scene.camera === 'zoom_in' ? 1.02 + progress * 0.08 : 1.10 - progress * 0.06
  const translateX =
    scene.camera === 'pan_left' ? -50 * progress : scene.camera === 'pan_right' ? 50 * progress : 0
  const translateY =
    scene.camera === 'tilt_up' ? -30 * progress : scene.camera === 'tilt_down' ? 30 * progress : 0

  if (!scene.image_url) {
    return (
      <AbsoluteFill style={{ background: 'linear-gradient(135deg, #12100e, #2b2520)' }} />
    )
  }

  return (
    <Img
      src={scene.image_url.startsWith('http') ? scene.image_url : staticFile(scene.image_url)}
      style={{
        height: '100%',
        objectFit: 'cover',
        transform: `scale(${scale}) translateX(${translateX}px) translateY(${translateY}px)`,
        width: '100%',
      }}
    />
  )
}

// 2. Editorial Subtitles (Vox / Johnny Harris Style)
function SceneSubtitle({ scene }: SceneProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  
  const text = (scene.subtitle || '').trim()
  if (!text) return null

  // Soft fade-in for the first 12 frames of the scene
  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.ease,
  })

  return (
    <div
      style={{
        alignSelf: 'center',
        bottom: 96,
        color: '#fdfdfa', // Warm paper-white
        fontFamily: "'Georgia', 'Garamond', 'Times New Roman', serif", // High-end editorial serif
        fontSize: 48,
        fontStyle: 'italic', // Soft narrative italic
        fontWeight: 500,
        left: 160,
        lineHeight: 1.35,
        maxWidth: 1600,
        position: 'absolute',
        right: 160,
        textAlign: 'center',
        textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8), 0px 4px 16px rgba(0, 0, 0, 0.5)', // Soft realistic drop shadow (no cartoon stroke)
        opacity,
        letterSpacing: '-0.2px',
      }}
    >
      {text}
    </div>
  )
}

// 3. Cinematic Film Dissolve / Fade-in
function SceneTransition() {
  const frame = useCurrentFrame()
  
  // Smooth fade-in overlay that makes scene entries feel like film dissolves
  const overlayOpacity = interpolate(frame, [0, 10], [1, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.ease,
  })

  if (overlayOpacity <= 0) return null

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0c0a09', // Dark charcoal-brown
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
      {/* Background Image / Motion */}
      <SceneImage scene={scene} />

      {/* Cinematic Vignette Overlay (Warm charcoal edges) */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle, transparent 30%, rgba(12, 10, 9, 0.85) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Warm Parchment Texture Blend (Gives images a paper/historical print feel) */}
      <AbsoluteFill
        style={{
          background: 'rgba(240, 225, 200, 0.08)',
          mixBlendMode: 'color-burn',
          pointerEvents: 'none',
        }}
      />

      {/* Film Dissolve Transition */}
      <SceneTransition />

      {/* Editorial Subtitles */}
      <SceneSubtitle scene={scene} />

      {/* Audio Narration */}
      {scene.voice_url && (
        <Audio
          src={scene.voice_url.startsWith('http') ? scene.voice_url : staticFile(scene.voice_url)}
        />
      )}
    </AbsoluteFill>
  )
}

export interface StoryZVideoProps {
  storyboard?: StoryboardJSON
}

export function StoryZVideo({ storyboard = storyboardFixture }: StoryZVideoProps) {
  const { fps } = useVideoConfig()
  let from = 0

  return (
    <AbsoluteFill style={{ backgroundColor: '#0c0a09' }}>
      {/* Background Music */}
      {storyboard.audio?.background_music_url && (
        <Audio
          src={
            storyboard.audio.background_music_url.startsWith('http')
              ? storyboard.audio.background_music_url
              : staticFile(storyboard.audio.background_music_url)
          }
          volume={storyboard.audio.background_music_volume ?? 0.12} // Lowered music volume to let voice shine
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
    </AbsoluteFill>
  )
}
