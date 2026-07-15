// Konfigurasi per-channel — satu engine (kode) dipakai lintas channel, "kepribadian"
// (bahasa, niche, kategori, voice, palette) dipilih dari sini berdasarkan channel aktif.

export type ChannelId = 'cabang-sejarah' | 'brainwhy' | 'cerita-tetangga'

export interface ChannelOpeningStyle {
  id: string
  instruction: string
}

export interface ChannelConfig {
  id: ChannelId
  name: string
  tagline: string
  language: 'id' | 'en'
  ttsVoice: string
  categories: string[]
  categoryPalette: Record<string, string>
  titlePrefix: string | null // null = judul bebas, bukan format tetap "Bagaimana Jika..."
  mascotName: string
  mascotAnchor: string // deskripsi fisik maskot, konsisten di setiap scene/setiap video
  cartoonStyle: string
  openingStyles: ChannelOpeningStyle[]
  fallbackTopics: string[]
  // Konsep split-screen thumbnail (kiri/kanan) — beda niche butuh framing beda,
  // JANGAN pakai framing "sejarah asli vs alternate reality" di luar Cabang Sejarah.
  thumbnailConcept: {
    left: (topic: string) => string
    right: (topic: string) => string
  }
  // 'split' = dua dunia bersanding + garis merah (khas Cabang Sejarah).
  // 'flat' = warna solid + stickman besar + judul tebal, 100% tanpa AI image (dipakai channel lain).
  thumbnailStyle: 'split' | 'flat'
  // Rotasi warna solid untuk thumbnailStyle 'flat'. Diabaikan kalau 'split'.
  thumbnailBgColors: string[]
  // Platform tujuan publish — menentukan branch mana yang dipakai di publish/route.ts.
  // Default (field tidak diisi) = 'youtube', 100% backward compatible dengan channel lama.
  publishPlatform?: 'youtube' | 'facebook'
  // Watermark logo kecil di pojok video sepanjang durasi — path relatif ke public/ (staticFile).
  // Default (tidak diisi) = tanpa watermark, channel lama tidak terpengaruh.
  watermarkAsset?: string
  prompts: {
    // Instruksi "kepribadian" narator, disisipkan ke semua system prompt AI
    narratorPersona: string
    // Struktur outline: dijelaskan ke AI sebagai urutan section & apa isinya
    outlineStructure: string
    // Format aturan image_prompt per scene (dipakai scenes.ts)
    sceneImageRules: string
  }
}

const CABANG_SEJARAH: ChannelConfig = {
  id: 'cabang-sejarah',
  name: 'Cabang Sejarah',
  tagline: 'Sejarah alternatif, dibayangkan ulang.',
  language: 'id',
  ttsVoice: process.env.TTS_VOICE || 'id-ID-ArdiNeural',
  categories: [
    'What-If Sejarah Nusantara',
    'What-If Sejarah Dunia',
    'What-If Tokoh Terkenal',
    'What-If Sains & Teknologi',
    'What-If Perang & Konflik',
    'What-If Bencana Alam',
  ],
  categoryPalette: {
    'What-If Sejarah Nusantara': 'warm sepia and gold tones, tropical earthy palette, batik-inspired accents',
    'What-If Sejarah Dunia': 'classic warm amber and parchment tones, vintage muted palette',
    'What-If Tokoh Terkenal': 'dramatic high-contrast portrait lighting, bold red and cream accents',
    'What-If Sains & Teknologi': 'cool blue and teal neon tones, clean futuristic palette',
    'What-If Perang & Konflik': 'desaturated steel grey and ember orange, smoky dramatic palette',
    'What-If Bencana Alam': 'dark stormy purple and ash grey, ominous cinematic palette',
  },
  titlePrefix: 'Bagaimana Jika',
  mascotName: 'Si Cabang',
  mascotAnchor: 'a simple white stickman character with plain round white head and two black dot eyes',
  cartoonStyle: 'vibrant colorful hand-drawn cartoon illustration, webcomic style, thick black ink outlines, rich saturated colors, flat cel shading, richly detailed scenery background, lively composition, children storybook art',
  openingStyles: [
    { id: 'pertanyaan_retoris', instruction: 'Buka dengan pertanyaan retoris yang menohok langsung ke penonton.' },
    { id: 'statement_kontroversial', instruction: 'Buka dengan pernyataan berani/kontroversial yang memancing perdebatan.' },
    { id: 'fakta_historis', instruction: 'Buka dengan satu fakta sejarah singkat yang mengejutkan (dengan angka/tahun konkret).' },
    { id: 'hipotesis_langsung', instruction: 'Buka langsung dengan hipotesis "Bayangkan jika..." tanpa basa-basi.' },
    { id: 'adegan_sinematik', instruction: 'Buka dengan deskripsi adegan sinematik yang menempatkan penonton di tengah momen krusial.' },
    { id: 'kontras_waktu', instruction: 'Buka dengan mengontraskan dunia nyata sekarang vs dunia alternatif yang akan dibahas.' },
    { id: 'tokoh_pov', instruction: 'Buka dari sudut pandang tokoh sejarah kunci di detik-detik penentu.' },
    { id: 'angka_mengejutkan', instruction: 'Buka dengan statistik atau angka mengejutkan yang relevan dengan topik.' },
    { id: 'teka_teki', instruction: 'Buka dengan teka-teki/misteri "apa yang sebenarnya terjadi seandainya..." yang menggantung.' },
    { id: 'analogi_relatable', instruction: 'Buka dengan analogi sederhana yang relatable dari kehidupan sehari-hari penonton.' },
  ],
  fallbackTopics: [
    'Bagaimana Jika Indonesia Tidak Pernah Dijajah Belanda?',
    'Bagaimana Jika Majapahit Tidak Pernah Runtuh?',
    'Bagaimana Jika Gunung Krakatau Tidak Meletus Tahun 1883?',
    'Bagaimana Jika Jepang Menang Perang Dunia II?',
    'Bagaimana Jika Internet Ditemukan 100 Tahun Lebih Awal?',
  ],
  thumbnailConcept: {
    left: (topic) => `the real historical events related to ${topic}, dark gloomy grim atmosphere, ruins and smoke, muted colors. Pure illustration only — no memes, no infographics, no diagrams, no captions, no speech bubbles, absolutely no text or writing of any kind anywhere in the image.`,
    right: (topic) => `epic alternate reality of ${topic}, golden glorious prosperous city, bright vivid colors, triumphant atmosphere. Pure illustration only — no memes, no infographics, no diagrams, no captions, no speech bubbles, absolutely no text or writing of any kind anywhere in the image.`,
  },
  thumbnailStyle: 'split',
  thumbnailBgColors: [],
  prompts: {
    narratorPersona: 'Kamu adalah showrunner video "what-if" sejarah alternatif (storytelling naratif yang seru, bukan dokumenter formal). Semua output dalam Bahasa Indonesia.',
    outlineStructure: '5 sections: 1 intro (sejarah asli & titik krusial) + 3 chapter (percabangan → konsekuensi langsung → efek domino jangka panjang) + 1 ending (refleksi & pertanyaan terbuka).',
    sceneImageRules: 'Format: "[AKSI karakter utama sesuai narasi], [orang/kerumunan/tokoh lain di scene — boleh sebut tokoh nyata seperti Hitler, Gajah Mada, dll], [setting & mood]". Karakter utama JANGAN dideskripsikan fisiknya dan JANGAN sebut gaya gambar — ditambahkan otomatis sistem. Buat scene HIDUP: ada orang, aksi, interaksi — bukan pemandangan kosong.',
  },
}

const BRAINWHY: ChannelConfig = {
  id: 'brainwhy',
  name: 'BrainWhy',
  tagline: 'Your brain, explained.',
  language: 'en',
  ttsVoice: 'en-US-GuyNeural',
  categories: [
    'Cognitive Biases',
    'Habits & Behavior',
    'Emotions & Mood',
    'Relationships & Social Psychology',
    'Sleep & Brain Health',
    'Dark Psychology & Manipulation',
  ],
  categoryPalette: {
    'Cognitive Biases': 'cool indigo and soft lavender tones, clean analytical palette',
    'Habits & Behavior': 'warm coral and deep navy accents, energetic focused palette',
    'Emotions & Mood': 'muted violet and dusty rose tones, introspective calm palette',
    'Relationships & Social Psychology': 'warm amber and indigo contrast, human connection palette',
    'Sleep & Brain Health': 'deep midnight blue and soft periwinkle, calm nocturnal palette',
    'Dark Psychology & Manipulation': 'high-contrast charcoal and coral red, tense dramatic palette',
  },
  titlePrefix: null,
  mascotName: 'Why',
  mascotAnchor: 'a simple stickman character with a round white head, two black dot eyes, a small smile, and an orange/coral brain-shaped icon glowing on top of its head like a lightbulb',
  cartoonStyle: 'clean modern flat vector illustration, minimal geometric style, thin bold outlines, deep indigo and soft lavender background tones with coral accent highlights, smooth flat shading, uncluttered composition, modern educational explainer art',
  openingStyles: [
    { id: 'rhetorical_question', instruction: 'Open with a sharp rhetorical question that hits the viewer directly.' },
    { id: 'bold_claim', instruction: 'Open with a bold, slightly controversial claim that challenges common assumptions.' },
    { id: 'surprising_fact', instruction: 'Open with one surprising psychology fact or statistic, concrete and specific.' },
    { id: 'direct_scenario', instruction: 'Open by describing a relatable everyday scenario the viewer has experienced.' },
    { id: 'cinematic_moment', instruction: 'Open with a vivid, cinematic micro-scene that puts the viewer inside a specific moment.' },
    { id: 'contrast_frame', instruction: 'Open by contrasting what people assume vs what actually happens in the brain.' },
    { id: 'second_person_confession', instruction: 'Open in second person, describing a behavior the viewer will recognize in themselves.' },
    { id: 'shocking_number', instruction: 'Open with a shocking number or study result relevant to the topic.' },
    { id: 'mystery_hook', instruction: 'Open with an unresolved mystery/question about why humans behave a certain way, left hanging.' },
    { id: 'simple_analogy', instruction: 'Open with a simple, relatable analogy from everyday life.' },
  ],
  fallbackTopics: [
    'Why You Can\'t Stop Checking Your Phone (Even When You Want To)',
    'The Psychology of Procrastination: Why Your Brain Fights Your Goals',
    'Why First Impressions Form in Under a Second',
    'The Real Reason You Remember Insults More Than Compliments',
    'Why Your Brain Lies to You About Yesterday',
  ],
  // thumbnailStyle 'split' — disamakan dengan Cabang Sejarah (dua dunia bersanding + garis merah),
  // cuma framing kontennya beda: bukan "sejarah asli vs alternate reality", tapi "bingung vs paham"
  // (sesuai konten psikologi/perilaku). "Pure illustration only — no memes/infographics/diagrams/
  // captions/speech bubbles" adalah instruksi yang terverifikasi paling ampuh cegah AI menghalusinasi
  // teks palsu di background (uji lokal 4/4 bersih), dipakai di sini juga.
  thumbnailConcept: {
    left: (topic) => `a person looking confused and overwhelmed, sitting in a minimalist room with a completely EMPTY plain solid-color wall (blank, no posters, no frames, no decorations) related to: ${topic}, dim cluttered atmosphere, muted cool colors. Pure character illustration only — no memes, no infographics, no diagrams, no captions, no speech bubbles, absolutely no text or writing of any kind anywhere in the image.`,
    right: (topic) => `the same person now looking calm, relieved, and clear-minded, sitting in a minimalist room with a completely EMPTY plain solid-color wall (blank, no posters, no frames, no decorations) related to: ${topic}, bright warm atmosphere, vivid colors. Pure character illustration only — no memes, no infographics, no diagrams, no captions, no speech bubbles, absolutely no text or writing of any kind anywhere in the image.`,
  },
  thumbnailStyle: 'split',
  thumbnailBgColors: [],
  prompts: {
    narratorPersona: 'You are a sharp, curious science communicator explaining human psychology and behavior in short, punchy explainer videos — engaging like a smart friend, not a textbook. All output in English.',
    outlineStructure: '5 sections: 1 intro (a relatable hook phenomenon) + 3 chapter (what\'s actually happening in the brain → why evolution/psychology wired us this way → real-life everyday examples) + 1 ending (practical takeaway + a thought-provoking question).',
    sceneImageRules: 'Format: "[main character\'s action matching the narration], [other people/context relevant to the scene], [setting & mood]". Do NOT describe the main character\'s physical appearance or art style — added automatically by the system. Make each scene feel ALIVE: people, action, interaction — not an empty background.',
  },
}

const CERITA_TETANGGA: ChannelConfig = {
  id: 'cerita-tetangga',
  name: 'Cerita Tetangga',
  tagline: 'Kisah nyata dari sekitar kita.',
  language: 'id',
  ttsVoice: 'id-ID-ArdiNeural',
  categories: [
    'Drama Keluarga',
    'Konflik Tetangga',
    'Kisah Mistis',
    'Kriminal & Pelajaran Hidup',
    'Perselingkuhan & Percintaan',
    'Kejadian Viral Warga',
  ],
  categoryPalette: {
    'Drama Keluarga': 'warm amber and soft brown tones, cozy domestic palette',
    'Konflik Tetangga': 'dusty terracotta and muted green, tense neighborhood palette',
    'Kisah Mistis': 'deep indigo and pale moonlight blue, eerie nocturnal palette',
    'Kriminal & Pelajaran Hidup': 'desaturated grey and warm ember accent, sobering palette',
    'Perselingkuhan & Percintaan': 'dusty rose and warm gold, melancholic romantic palette',
    'Kejadian Viral Warga': 'bright golden hour orange and cream, lively kampung palette',
  },
  titlePrefix: null,
  mascotName: 'Warga',
  mascotAnchor: 'ordinary Indonesian kampung residents in everyday clothing, warm expressive faces — no single fixed narrator character, each scene features whichever character the story is about',
  cartoonStyle: 'warm hand-drawn cartoon illustration, soft rounded ink outlines, golden-hour and lamplight color grading, cozy kampung storybook art, expressive faces, gentle cel shading',
  openingStyles: [
    { id: 'pertanyaan_retoris', instruction: 'Buka dengan pertanyaan retoris yang bikin penonton penasaran soal nasib tokoh.' },
    { id: 'statement_kontroversial', instruction: 'Buka dengan pernyataan yang bikin geram/penasaran soal kejadian di lingkungan.' },
    { id: 'fakta_pembuka', instruction: 'Buka dengan satu fakta/kejadian singkat yang mengejutkan tanpa spoiler akhir cerita.' },
    { id: 'hipotesis_langsung', instruction: 'Buka langsung dengan gambaran situasi tegang di tengah cerita, baru mundur ke awal.' },
    { id: 'adegan_sinematik', instruction: 'Buka dengan deskripsi adegan sehari-hari yang tiba-tiba berubah jadi tegang.' },
    { id: 'kontras_waktu', instruction: 'Buka dengan mengontraskan kehidupan tokoh sebelum dan sesudah kejadian.' },
    { id: 'tokoh_pov', instruction: 'Buka dari sudut pandang tokoh utama saat momen kejadian penting berlangsung.' },
    { id: 'angka_mengejutkan', instruction: 'Buka dengan detail kecil yang mengejutkan (waktu, tempat, kebiasaan) yang jadi kunci cerita.' },
    { id: 'teka_teki', instruction: 'Buka dengan teka-teki "kenapa dia bisa begitu?" yang menggantung sampai pertengahan cerita.' },
    { id: 'analogi_relatable', instruction: 'Buka dengan analogi/pengalaman sehari-hari yang relatable buat penonton dewasa.' },
  ],
  fallbackTopics: [
    'Wanita Ini Curiga Suaminya Selingkuh, Ternyata Kebenarannya Lebih Menyakitkan',
    'Tetangga Baru Ini Selalu Aneh Tiap Malam Jumat, Warga Akhirnya Cari Tahu',
    'Anak Ini Diusir dari Rumah, 10 Tahun Kemudian Dia Kembali Membawa Kejutan',
    'Ibu Ini Rela Kerja Serabutan demi Anaknya Sekolah, Endingnya Bikin Haru',
    'Kejadian Aneh di Gang Sempit Ini Bikin Satu RT Gempar Semalaman',
  ],
  thumbnailConcept: {
    left: (topic) => `an ordinary Indonesian kampung resident looking worried and troubled, standing in front of a modest house at dusk, related to: ${topic}, tense muted atmosphere, warm dim lighting. Pure character illustration only — no memes, no infographics, no diagrams, no captions, no speech bubbles, absolutely no text or writing of any kind anywhere in the image.`,
    right: (topic) => `the resolution moment — relief, tears, or a warm reunion, same kampung setting now bathed in warm golden light, related to: ${topic}, emotional heartfelt atmosphere. Pure character illustration only — no memes, no infographics, no diagrams, no captions, no speech bubbles, absolutely no text or writing of any kind anywhere in the image.`,
  },
  thumbnailStyle: 'split',
  thumbnailBgColors: [],
  publishPlatform: 'facebook',
  watermarkAsset: 'branding/cerita-tetangga-mark.png',
  prompts: {
    narratorPersona: 'Kamu adalah pencerita kisah hidup/drama warga gaya obrolan tetangga yang hangat dan santai — bukan berita formal. SELALU jelas ini kisah FIKSI yang terinspirasi kejadian nyata (nama, tempat, dan detail identitas disamarkan/dikomposit dari beberapa kejadian). Semua output dalam Bahasa Indonesia.',
    outlineStructure: '5 sections: 1 intro (perkenalan situasi & hook awal masalah) + 3 chapter (memburuknya situasi → titik krusial/konflik memuncak → jalan keluar atau kebenaran terungkap) + 1 ending (pelajaran hidup/moral, bukan cuma penutup).',
    sceneImageRules: 'Format: "[aksi tokoh sesuai narasi], [orang lain/keluarga/tetangga di scene], [setting rumah/gang/lingkungan & mood]". Karakter JANGAN dideskripsikan fisiknya secara detail dan JANGAN sebut gaya gambar — ditambahkan otomatis sistem. Buat scene HIDUP dan personal — ekspresi wajah, interaksi, suasana rumah/kampung yang relatable.',
  },
}

const CHANNELS: Record<ChannelId, ChannelConfig> = {
  'cabang-sejarah': CABANG_SEJARAH,
  'brainwhy': BRAINWHY,
  'cerita-tetangga': CERITA_TETANGGA,
}

export function getChannel(channelId?: string | null): ChannelConfig {
  if (!channelId) return CABANG_SEJARAH
  return CHANNELS[channelId as ChannelId] ?? CABANG_SEJARAH
}

// Channel dikirim scripts pipeline via header `x-channel-id` atau query `?channel=`.
// undefined = default (cabang-sejarah / schema public) — 100% backward compatible.
export function resolveChannelId(request: Request): ChannelId | undefined {
  const url = new URL(request.url)
  const raw = request.headers.get('x-channel-id') || url.searchParams.get('channel')
  if (raw && raw in CHANNELS) return raw as ChannelId
  return undefined
}
