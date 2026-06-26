# DIRECTOR_ENGINE.md

> Dokumentasi lengkap Director Engine — komponen terpenting dalam StoryZ yang bertanggung jawab menjaga konsistensi visual seluruh pipeline.

---

## Peran Director Engine

Director Engine adalah modul AI yang dipanggil **satu kali** setelah Research selesai, dan outputnya digunakan oleh **semua modul AI downstream** sebagai referensi wajib.

Analoginya: Director Engine adalah sutradara film yang menetapkan visi kreatif sebelum syuting dimulai. Semua departemen (kamera, kostum, pencahayaan, dll.) mengikuti arahan sutradara.

---

## Input

```typescript
interface DirectorInput {
  topic: string
  research: {
    summary: string
    facts: string[]
    timeline: { year: string; event: string }[]
  }
}
```

---

## Output — Semua Bible

### Visual Bible

Deskripsi gaya visual keseluruhan video. Digunakan oleh Image Prompt Generator.

```typescript
interface VisualBible {
  genre: string              // 'documentary' | 'cinematic' | 'educational' | ...
  visual_style: string       // deskripsi panjang gaya visual
  image_style: string        // 'photorealistic' | 'painterly' | 'illustrated' | ...
  color_palette: string[]    // hex atau nama warna dominant
  lighting: string           // 'golden hour' | 'dramatic chiaroscuro' | ...
  emotion: string            // 'epic' | 'melancholic' | 'tense' | ...
  transition: string         // 'fade' | 'cut' | 'dissolve' | ...
}
```

### Character Bible

Panduan konsistensi karakter yang muncul dalam video. Digunakan oleh Prompt Generator untuk menjaga konsistensi wajah/kostum karakter.

```typescript
interface CharacterBible {
  characters: {
    name: string
    description: string       // deskripsi fisik detail
    clothing: string
    prompt_anchor: string     // teks yang selalu dimasukkan ke prompt jika karakter muncul
  }[]
}
```

### Environment Bible

Panduan setting dan lingkungan. Memastikan lokasi yang sama terlihat konsisten di berbagai scene.

```typescript
interface EnvironmentBible {
  locations: {
    name: string
    description: string
    prompt_anchor: string     // teks yang selalu dimasukkan ke prompt jika lokasi muncul
  }[]
  era: string                 // periode waktu (misal: "Abad ke-14, Jawa Timur")
  geography: string
}
```

### Camera Bible

Panduan gerakan kamera dan komposisi. Digunakan oleh Storyboard Generator.

```typescript
interface CameraBible {
  default_movement: string    // 'slow_pan' | 'static' | 'gentle_zoom'
  allowed_movements: string[] // daftar pergerakan yang boleh digunakan
  aspect_ratio: string        // '16:9'
  composition_rules: string   // 'rule of thirds', 'centered subject', dll.
}
```

### Motion Bible

Panduan efek motion dan transisi antar scene.

```typescript
interface MotionBible {
  transition_style: string
  effect_palette: string[]    // efek yang boleh digunakan: 'light_rays' | 'fog' | 'dust' | ...
  timing: string              // 'slow burn' | 'dynamic' | ...
}
```

### Thumbnail Bible

Panduan style thumbnail.

```typescript
interface ThumbnailBible {
  style: string               // 'dramatic close-up' | 'wide establishing shot' | ...
  color_scheme: string
  text_style: string          // panduan font dan warna overlay text
  composition: string
}
```

---

## Full Output Type

```typescript
interface DirectorOutput {
  visual_bible: VisualBible
  character_bible: CharacterBible
  environment_bible: EnvironmentBible
  camera_bible: CameraBible
  motion_bible: MotionBible
  thumbnail_bible: ThumbnailBible

  // Shorthand fields (derived dari bible, untuk kemudahan akses)
  genre: string
  visual_style: string
  emotion: string
  lighting: string
  color_palette: string[]
  thumbnail_style: string
  voice_style: string
  camera_style: string
  transition: string
  image_style: string
}
```

---

## Cara Modul Downstream Menggunakan Director

Setiap modul AI **wajib** mengambil data Director dari database sebelum generate output.

### Contoh: Image Prompt Generator

```typescript
async function generateImagePrompt(scene: Scene, director: DirectorOutput): Promise<string> {
  const characterAnchor = resolveCharacterAnchors(scene.narration, director.character_bible)
  const environmentAnchor = resolveEnvironmentAnchor(scene.narration, director.environment_bible)

  const prompt = [
    scene.narration_to_visual_description,
    director.visual_bible.image_style,
    director.visual_bible.lighting,
    director.visual_bible.color_palette.join(', '),
    characterAnchor,
    environmentAnchor,
    `emotion: ${director.visual_bible.emotion}`,
  ].filter(Boolean).join(', ')

  return prompt
}
```

### Contoh: Script Generator

```typescript
async function generateScript(section: OutlineSection, director: DirectorOutput): Promise<string> {
  const systemPrompt = `
    Kamu adalah penulis naskah dokumenter.
    Genre: ${director.genre}
    Tone: ${director.emotion}
    Voice style: ${director.voice_style}
    Era: ${director.environment_bible.era}
    
    Tulis narasi untuk section: ${section.title}
  `
  // ...
}
```

---

## Aturan Konsistensi

1. **Director tidak boleh diubah** setelah Storyboard selesai dibuat, kecuali user secara eksplisit memilih "Reset Director"
2. **Setiap prompt gambar wajib menyertakan** `image_style` dari Visual Bible
3. **Karakter yang sama** harus selalu menggunakan `prompt_anchor` dari Character Bible
4. **Lokasi yang sama** harus selalu menggunakan `prompt_anchor` dari Environment Bible
5. **Tidak ada scene** yang boleh menggunakan style visual di luar `image_style` yang ditetapkan Director

---

## AI Prompt Template untuk Director Engine

```
Kamu adalah seorang sutradara film dokumenter senior.

Berdasarkan riset berikut tentang topik "{topic}":
- Summary: {research.summary}
- Fakta utama: {research.facts}
- Timeline: {research.timeline}

Buatkan "Director's Vision" lengkap yang mencakup:
1. Visual Bible (genre, style, warna, pencahayaan, emosi)
2. Character Bible (semua tokoh penting yang akan muncul)
3. Environment Bible (semua lokasi yang akan ditampilkan)
4. Camera Bible (panduan gerakan kamera)
5. Motion Bible (efek dan transisi)
6. Thumbnail Bible (style thumbnail YouTube)

Output harus berupa JSON sesuai schema DirectorOutput.
Semua keputusan visual harus konsisten dan kohesif satu sama lain.
```