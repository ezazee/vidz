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

function SceneImage({ scene }: SceneProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const durationInFrames = Math.max(1, Math.round(scene.duration * fps))

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })

  const scale = scene.camera === 'zoom_in' ? 1 + progress * 0.12 : 1.06 - progress * 0.06
  const translateX =
    scene.camera === 'pan_left' ? -80 * progress : scene.camera === 'pan_right' ? 80 * progress : 0

  if (!scene.image_url) {
    return (
      <AbsoluteFill style={{ background: 'linear-gradient(135deg, #0f766e, #1f2937)' }} />
    )
  }

  return (
    <Img
      src={scene.image_url.startsWith('http') ? scene.image_url : staticFile(scene.image_url)}
      style={{
        height: '100%',
        objectFit: 'cover',
        transform: `scale(${scale}) translateX(${translateX}px)`,
        width: '100%',
      }}
    />
  )
}

function SceneSubtitle({ scene }: SceneProps) {
  return (
    <div
      style={{
        alignSelf: 'center',
        backgroundColor: 'rgba(10, 16, 20, 0.72)',
        borderRadius: 6,
        bottom: 72,
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: 44,
        fontWeight: 700,
        left: 180,
        lineHeight: 1.18,
        maxWidth: 1560,
        padding: '18px 28px',
        position: 'absolute',
        right: 180,
        textAlign: 'center',
      }}
    >
      {scene.subtitle}
    </div>
  )
}

function StoryScene({ scene }: SceneProps) {
  return (
    <AbsoluteFill>
      <SceneImage scene={scene} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.34))' }} />
      {scene.effect === 'light_rays' ? (
        <AbsoluteFill
          style={{
            background:
              'radial-gradient(circle at 25% 10%, rgba(255, 230, 160, 0.30), transparent 34%)',
          }}
        />
      ) : null}
      <SceneSubtitle scene={scene} />
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
    <AbsoluteFill style={{ backgroundColor: '#111827' }}>
      {storyboard.audio?.background_music_url && (
        <Audio
          src={
            storyboard.audio.background_music_url.startsWith('http')
              ? storyboard.audio.background_music_url
              : staticFile(storyboard.audio.background_music_url)
          }
          volume={storyboard.audio.background_music_volume ?? 0.2}
          loop
        />
      )}
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
