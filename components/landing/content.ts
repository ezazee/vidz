export interface LandingChannel {
  name: string
  line: string
  meta: string
}

/** Sumber: lib/channels.ts — disalin ke sisi UI supaya landing tidak menarik
 *  konfigurasi pipeline (dan semua env-nya) ke dalam bundle browser. */
export const LANDING_CHANNELS: LandingChannel[] = [
  {
    name: 'Cabang Sejarah',
    line: 'Sejarah alternatif, dibayangkan ulang. Satu titik keputusan diganti, sisanya ikut berubah.',
    meta: 'Bahasa Indonesia · YouTube',
  },
  {
    name: 'BrainWhy',
    line: 'Your brain, explained. Kenapa kamu melakukan hal yang kamu sendiri tahu sebaiknya tidak dilakukan.',
    meta: 'English · YouTube',
  },
  {
    name: 'Cerita Tetangga',
    line: 'Kisah nyata dari sekitar kita — yang biasanya cuma jadi obrolan pagar rumah.',
    meta: 'Bahasa Indonesia · Facebook',
  },
]

export interface PipelineStage {
  n: string
  name: string
  line: string
}

/** Sumber: docs/WORKFLOW.MD — enam tahap AI, lalu render. Jangan tambah tahap
 *  di sini tanpa mengubah dokumen itu dulu. */
export const PIPELINE: PipelineStage[] = [
  {
    n: '01',
    name: 'Research',
    line: 'AI meriset topik: ringkasan, fakta, kronologi, dan tokoh kunci yang relevan.',
  },
  {
    n: '02',
    name: 'Director',
    line: 'Menetapkan arah visual sebelum satu gambar pun dibuat — gaya, emosi, pencahayaan, palet, gerak kamera.',
  },
  {
    n: '03',
    name: 'Outline',
    line: 'Struktur video disusun: pembuka, bab-bab isi, penutup. Gaya pembukanya dirotasi supaya tidak seragam antar video.',
  },
  {
    n: '04',
    name: 'Scenes',
    line: 'Tiap bab dipecah jadi adegan. Satu adegan membawa narasi, prompt gambar, durasi, dan pergerakan kameranya.',
  },
  {
    n: '05',
    name: 'SEO',
    line: 'Judul, deskripsi, tag, dan hashtag disiapkan mengikuti bahasa dan kategori channelnya.',
  },
  {
    n: '06',
    name: 'Thumbnail',
    line: 'Thumbnail dirakit otomatis dari template channel, lalu diunggah ke penyimpanan objek.',
  },
  {
    n: '07',
    name: 'Render',
    line: 'Gambar dan suara dibuat per adegan, disusun jadi video, dipotong jadi bagian, dirender paralel, lalu disatukan lagi.',
  },
  {
    n: '08',
    name: 'Publish',
    line: 'Video final diunggah ke platform tujuan channel — YouTube atau Facebook — beserta metadatanya.',
  },
]

export interface Bible {
  name: string
  line: string
}

/** Enam "bible" keluaran Director Engine — lihat docs/DIRECTOR-ENGINE. */
export const BIBLES: Bible[] = [
  { name: 'Visual', line: 'Gaya gambar, palet warna, dan mood yang mengikat semua adegan.' },
  { name: 'Character', line: 'Penampilan tokoh utama dikunci sekali, dipakai ulang di setiap adegan.' },
  { name: 'Environment', line: 'Lokasi dan latar dijaga konsisten, tidak berubah-ubah antar adegan.' },
  { name: 'Camera', line: 'Perbendaharaan gerak kamera: diam, dorong perlahan, geser, atau tarik mundur.' },
  { name: 'Motion', line: 'Bagaimana satu adegan berpindah ke adegan berikutnya.' },
  { name: 'Thumbnail', line: 'Aturan sampul: komposisi, kontras, dan apa yang boleh tampil di sana.' },
]

export interface QaAgent {
  name: string
  line: string
}

/** Tiga pemeriksa yang berjalan setelah adegan jadi, sebelum gambar & suara
 *  dibuat. Lihat lib/ai/qa.ts. */
export const QA_AGENTS: QaAgent[] = [
  {
    name: 'Storyboard',
    line: 'Memeriksa nama, angka, dan urutan waktu tidak saling bertabrakan antar adegan — dan tiap adegan membawa detail konkret, bukan kalimat kosong.',
  },
  {
    name: 'Naskah suara',
    line: 'Memeriksa kalimatnya enak dibacakan mesin: ritmenya bervariasi, angkanya tidak salah baca, sapaannya konsisten sepanjang video.',
  },
  {
    name: 'Prompt gambar',
    line: 'Memeriksa tiap prompt benar-benar menggambarkan narasinya, tidak generik, dan tidak menulis ulang hal yang sudah ditambahkan sistem.',
  },
]
