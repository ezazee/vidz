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

// 1. Slow, Organic Ken Burns Camera Drift + Handheld Camera Shake
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
  const baseScale = scene.camera === 'zoom_in' ? 1.02 + progress * 0.09 : 1.12 - progress * 0.07
  const baseTranslateX =
    scene.camera === 'pan_left' ? -40 * progress : scene.camera === 'pan_right' ? 40 * progress : 0
  const baseTranslateY =
    scene.camera === 'tilt_up' ? -25 * progress : scene.camera === 'tilt_down' ? 25 * progress : 0

  // Organic handheld camera shake (adds realistic life to static images)
  const shakeX = Math.sin(frame * 0.12) * 1.2 + Math.cos(frame * 0.07) * 0.8
  const shakeY = Math.cos(frame * 0.10) * 1.2 + Math.sin(frame * 0.08) * 0.8
  const shakeRotate = Math.sin(frame * 0.04) * 0.15 // organic lens sway/rotation

  const scale = baseScale + 0.01 // extra margin to prevent black edges during shake
  const translateX = baseTranslateX + shakeX
  const translateY = baseTranslateY + shakeY
  const rotate = shakeRotate

  if (!scene.image_url) {
    return (
      <AbsoluteFill style={{ background: 'linear-gradient(135deg, #12100e, #2b2520)' }} />
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
        transform: `scale(${scale}) translateX(${translateX}px) translateY(${translateY}px) rotate(${rotate}deg)`,
        width: '100%',
      }}
    />
  )
}

// 2. Premium Word-by-Word Animated Subtitles (Vox / Johnny Harris Style)
function SceneSubtitle({ scene }: SceneProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  
  const text = (scene.subtitle || '').trim()
  if (!text) return null

  const words = text.split(' ')
  
  // Hitung durasi per kata secara dinamis agar pas dengan durasi suara narasi adegan
  // Kita ingin seluruh kata selesai muncul pada 85% durasi adegan agar penonton sempat membaca kalimat lengkap
  const totalFrames = Math.max(1, Math.round(scene.duration * fps))
  const availableFrames = totalFrames * 0.85
  const durationPerWord = Math.max(1, availableFrames / words.length)

  return (
    <div
      style={{
        alignSelf: 'center',
        bottom: 100,
        color: '#fdfdfa', // Warm paper-white
        fontFamily: "'Georgia', 'Garamond', 'Times New Roman', serif", // High-end editorial serif
        fontSize: 46,
        fontStyle: 'italic', // Soft narrative italic
        fontWeight: 500,
        left: 120,
        lineHeight: 1.45,
        maxWidth: 1680,
        position: 'absolute',
        right: 120,
        textAlign: 'center',
        textShadow: '1px 1px 3px rgba(0, 0, 0, 0.9), 0px 4px 18px rgba(0, 0, 0, 0.6)', // Soft realistic drop shadow
        letterSpacing: '-0.1px',
      }}
    >
      {words.map((word, index) => {
        // Tentukan frame mulai untuk setiap kata secara proporsional
        const startFrame = index * durationPerWord
        const fadeDuration = Math.min(8, durationPerWord) // Durasi animasi fade-in yang responsif
        
        const wordOpacity = interpolate(frame, [startFrame, startFrame + fadeDuration], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.25, 1, 0.5, 1),
        })

        // Check if word is a "keyword" to highlight (contains numbers, starts with capital letter, or is long)
        const isNumeric = /\d/.test(word)
        const isCapitalized = index > 0 && /^[A-Z]/.test(word.replace(/['"“]/g, ''))
        const isHighlight = isNumeric || isCapitalized || word.length > 8
        const color = isHighlight ? '#dca542' : '#fdfdfa' // Warm golden highlight

        return (
          <span
            key={index}
            style={{
              opacity: wordOpacity,
              color,
              display: 'inline-block',
              marginRight: '12px',
              transition: 'color 0.3s ease',
            }}
          >
            {word}
          </span>
        )
      })}
    </div>
  )
}

// 3. Option 4 - Scribble & Sketch Overlay Animations (Hand-drawn, Tactical, and Stabilo Marks)

// A. Hand-drawn Circle overlay that sways and draws itself on the screen
function HandDrawnCircle() {
  const frame = useCurrentFrame()
  
  // Start drawing at frame 15, finish at 35
  const draw = interpolate(frame, [15, 35], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  })

  // Fade out near the end of the scene (e.g. from frame 120 onwards)
  const opacity = interpolate(frame, [105, 125], [0.85, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const pathLength = 1000 // Approximate length of the custom path

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 4, opacity }}>
      <svg width="320" height="320" viewBox="0 0 200 200" style={{ transform: 'rotate(-8deg)' }}>
        <path
          d="M 100,20 C 150,20 185,55 180,105 C 175,155 140,180 95,180 C 45,180 20,140 20,95 C 20,45 60,18 105,22"
          fill="none"
          stroke="#dca542" // Warm gold
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={pathLength}
          strokeDashoffset={pathLength * draw}
          filter="drop-shadow(0px 2px 5px rgba(0,0,0,0.5))"
        />
      </svg>
    </div>
  )
}

// B. Tactical Camera Reticle that frames the scene
function TacticalReticle() {
  const frame = useCurrentFrame()
  
  // Draws corner lines from frame 5 to 25
  const draw = interpolate(frame, [5, 25], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.ease,
  })

  const opacity = interpolate(frame, [105, 125], [0.45, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const pathLength = 100

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 4, opacity, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="92%" height="92%" viewBox="0 0 1000 562" style={{ position: 'absolute' }}>
        {/* Top-Left Corner */}
        <path d="M 80,120 L 80,80 L 120,80" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray={pathLength} strokeDashoffset={pathLength * draw} />
        {/* Top-Right Corner */}
        <path d="M 920,120 L 920,80 L 880,80" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray={pathLength} strokeDashoffset={pathLength * draw} />
        {/* Bottom-Left Corner */}
        <path d="M 80,442 L 80,482 L 120,482" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray={pathLength} strokeDashoffset={pathLength * draw} />
        {/* Bottom-Right Corner */}
        <path d="M 920,442 L 920,482 L 880,482" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray={pathLength} strokeDashoffset={pathLength * draw} />

        {/* Center crosshair */}
        <circle cx="500" cy="281" r="5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" style={{ opacity: 1 - draw }} />
        <line x1="482" y1="281" x2="492" y2="281" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" style={{ opacity: 1 - draw }} />
        <line x1="508" y1="281" x2="518" y2="281" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" style={{ opacity: 1 - draw }} />
        <line x1="500" y1="263" x2="500" y2="273" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" style={{ opacity: 1 - draw }} />
        <line x1="500" y1="289" x2="500" y2="299" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" style={{ opacity: 1 - draw }} />
      </svg>
    </AbsoluteFill>
  )
}

// C. Highlighter/Stabilo sweep that marks a key center line
function StabiloHighlight() {
  const frame = useCurrentFrame()
  
  // Draws from frame 20 to 45
  const draw = interpolate(frame, [20, 45], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 1, 0.5, 1),
  })

  const opacity = interpolate(frame, [105, 125], [0.8, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        position: 'absolute',
        left: '25%',
        right: '25%',
        top: '42%',
        height: '35px',
        background: `linear-gradient(90deg, rgba(220, 165, 66, 0.3) ${draw}%, transparent ${draw}%)`,
        borderLeft: draw > 0 ? '3px solid rgba(220, 165, 66, 0.7)' : 'none',
        borderRadius: '3px',
        boxShadow: '0 0 15px rgba(220, 165, 66, 0.1)',
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
        zIndex: 4,
        opacity,
      }}
    />
  )
}

// 4. Cinematic Film Overlays (Film Grain, Scratches, and Flickering Light Leaks)
function FilmOverlay() {
  const frame = useCurrentFrame()
  
  // Create a randomized light leak effect
  const leakOpacity = interpolate(
    Math.sin(frame * 0.05) * Math.cos(frame * 0.03),
    [-1, 1],
    [0.02, 0.09]
  )

  // Randomize grain position every frame to simulate real film grain
  const grainX = (frame * 127) % 100
  const grainY = (frame * 163) % 100

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 5 }}>
      {/* Real Film Grain (CSS SVG Noise) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.09,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundPosition: `${grainX}% ${grainY}%`,
          backgroundSize: '250px 250px',
        }}
      />
      
      {/* Warm Golden Light Leak (Sweeping across the top-right corner) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 80% 20%, rgba(220, 165, 66, 0.4) 0%, transparent 60%)',
          opacity: leakOpacity,
          mixBlendMode: 'screen',
        }}
      />

      {/* Historical Archival Grid Lines (Very subtle) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: '1px solid rgba(255, 255, 255, 0.02)',
          background: 'linear-gradient(rgba(255,255,255,0.007) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.007) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
          opacity: 0.8,
        }}
      />
    </AbsoluteFill>
  )
}

// 5. Cinematic Film Dissolve / Fade-in
function SceneTransition() {
  const frame = useCurrentFrame()
  
  // Smooth fade-in overlay that makes scene entries feel like film dissolves
  const overlayOpacity = interpolate(frame, [0, 12], [1, 0], {
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

function StoryScene({ scene }: SceneProps & { index: number }) {
  const index = scene.order_index ?? 0
  
  return (
    <AbsoluteFill>
      {/* Background Image / Motion */}
      <SceneImage scene={scene} />

      {/* Cinematic Vignette Overlay (Warm charcoal edges) */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle, transparent 30%, rgba(12, 10, 9, 0.85) 100%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Warm Parchment Texture Blend (Gives images a paper/historical print feel) */}
      <AbsoluteFill
        style={{
          background: 'rgba(240, 225, 200, 0.08)',
          mixBlendMode: 'color-burn',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* Removed Scribble & Sketch Overlays per user request */}

      {/* Real Film Overlays & Light Leaks */}
      <FilmOverlay />

      {/* Film Dissolve Transition */}
      <SceneTransition />

      {/* Editorial Subtitles */}
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
            <StoryScene scene={scene} index={scene.order_index} />
          </Sequence>
        )
        from += durationInFrames
        return sequence
      })}
    </AbsoluteFill>
  )
}
