# RENDER_ENGINE.md

> Dokumentasi lengkap rendering pipeline StoryZ — dari storyboard JSON hingga file MP4 final.

---

## Philosophy

StoryZ tidak menggunakan image-to-video AI. Sebaliknya rendering dilakukan dengan:

- **AI-generated images** sebagai frame visual
- **Camera animation** (pan, zoom, static) sebagai gerak
- **Motion effects** (parallax, light rays, fog, dll.) sebagai nuansa sinematik
- **Voice over** sebagai audio narasi
- **Subtitle** yang disinkronisasi dengan voice
- **Background music** sebagai lapisan audio tambahan

Pendekatan ini **jauh lebih murah** dari image-to-video AI, namun tetap menghasilkan video berkualitas profesional.

---

## Tools

| Tool | Fungsi |
|---|---|
| Remotion | Komposisi video berbasis React component |
| FFmpeg | Encoding video, muxing audio, output MP4 |
| Sharp | Resize, crop, dan composite gambar sebelum render |

---

## Storyboard JSON Schema

Renderer hanya membaca JSON. Format wajib:

```typescript
interface StoryboardJSON {
  project_id: string
  title: string
  director: DirectorOutput
  scenes: SceneJSON[]
  audio: {
    background_music_url?: string
    background_music_volume: number   // 0–1
  }
}

interface SceneJSON {
  id: string
  order_index: number
  duration: number              // detik
  narration: string
  subtitle: string
  image_url: string
  voice_url: string
  camera: CameraMovement
  effect: SceneEffect
  transition: TransitionType
  emotion: string
}

type CameraMovement = 'static' | 'pan_left' | 'pan_right' | 'zoom_in' | 'zoom_out' | 'tilt_up' | 'tilt_down'
type SceneEffect   = 'none' | 'light_rays' | 'fog' | 'dust' | 'rain' | 'snow' | 'particles'
type TransitionType = 'cut' | 'fade' | 'dissolve' | 'wipe'
```

---

## Remotion Composition

### Struktur komponen

```
<Composition>
  └── <VideoComposition>           ← root composition
        ├── <Scene key={0}>
        │     ├── <SceneImage />   ← animated image dengan camera movement
        │     ├── <SceneEffect />  ← overlay effect (fog, light rays, dll.)
        │     ├── <SceneAudio />   ← voice over per scene
        │     └── <SceneSubtitle />← subtitle bar
        ├── <Scene key={1}>
        │     └── ...
        └── <BackgroundMusic />    ← audio layer musik, sepanjang video
```

### Camera animation

Implementasi camera movement menggunakan Remotion `interpolate`:

```typescript
// Contoh: zoom_in
const scale = interpolate(frame, [0, durationInFrames], [1, 1.15], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
})

// Contoh: pan_left
const translateX = interpolate(frame, [0, durationInFrames], [0, -80], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
})
```

### Transition

Transisi antar scene diimplementasi dengan `interpolate` opacity di boundary scene:

```typescript
// Fade out di akhir scene
const opacity = frame > durationInFrames - TRANSITION_FRAMES
  ? interpolate(frame, [durationInFrames - TRANSITION_FRAMES, durationInFrames], [1, 0])
  : 1
```

---

## FFmpeg Pipeline

Setelah Remotion menghasilkan sequence PNG frames:

```bash
# 1. Render frames via Remotion CLI
npx remotion render VideoComposition output/frames/ \
  --props='./storyboard.json' \
  --image-format=png \
  --jpeg-quality=90

# 2. Mux frames + audio via FFmpeg
ffmpeg \
  -framerate 30 \
  -i output/frames/%d.png \
  -i combined_audio.mp3 \
  -c:v libx264 \
  -preset slow \
  -crf 18 \
  -pix_fmt yuv420p \
  -c:a aac \
  -b:a 192k \
  -movflags +faststart \
  output/final.mp4
```

---

## Sharp — Image Pre-processing

Sebelum dirender, setiap gambar diproses oleh Sharp:

```typescript
import sharp from 'sharp'

async function prepareSceneImage(imageUrl: string, targetWidth = 1920, targetHeight = 1080) {
  const buffer = await fetch(imageUrl).then(r => r.arrayBuffer())
  
  return sharp(Buffer.from(buffer))
    .resize(targetWidth, targetHeight, {
      fit: 'cover',
      position: 'centre',
    })
    .png({ quality: 90 })
    .toBuffer()
}
```

---

## Output Spec

| Property | Value |
|---|---|
| Format | MP4 (H.264 + AAC) |
| Resolution | 1920×1080 (Full HD) |
| Frame rate | 30 fps |
| Video bitrate | ~8 Mbps (CRF 18) |
| Audio bitrate | 192 kbps |
| Duration | 10–15 menit |

---

## Partial Render

Untuk regenerate satu scene, runner mendukung mode `partial`:

```typescript
// Payload dari repository_dispatch
{
  project_id: string
  mode: 'partial'
  scene_ids: string[]   // hanya scene yang perlu di-render ulang
}
```

Pada mode partial:
1. Download storyboard JSON
2. Filter hanya scene yang ada di `scene_ids`
3. Render scene-scene tersebut saja
4. Gabungkan dengan scene lain yang sudah ada (tidak di-render ulang)
5. FFmpeg: concat semua scene → output MP4 final baru

---

## Phase 2 — Advanced Motion (Roadmap)

Efek-efek berikut akan ditambahkan di Phase 2:

| Effect | Implementasi |
|---|---|
| Parallax | Multi-layer image compositing dengan depth offset |
| Camera Shake | Noise-based transform jitter |
| Fog | Animated overlay dengan opacity gradients |
| Rain | Particle system via Canvas |
| Snow | Particle system via Canvas |
| Light Rays | Radial gradient overlay dengan animated opacity |
| Particles | Custom particle engine |