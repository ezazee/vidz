// ponytail: one-shot manual trigger, bukan bagian pipeline permanen. Mirror alur n8n (buat
// project -> auto_publish=true -> trigger AI pipeline) tapi jalan sekarang juga tanpa nunggu
// jadwal/n8n. Auto_publish=true bikin render-jobs PATCH handler auto-publish begitu render selesai.
require('dotenv').config()
const { neon } = require('@neondatabase/serverless')

const BASE_URL = 'https://vidz-factory.vercel.app'
const API_SECRET = process.env.API_SECRET

const BW_TOPICS = [
  "Why You Can't Stop Checking Your Phone (Even When You Want To)",
  'The Psychology of Procrastination: Why Your Brain Fights Your Goals',
  'Why First Impressions Form in Under a Second',
  'The Real Reason You Remember Insults More Than Compliments',
  'Why Your Brain Lies to You About Yesterday',
]
const CT_TOPICS = [
  'Wanita Ini Curiga Suaminya Selingkuh, Ternyata Kebenarannya Lebih Menyakitkan',
  'Tetangga Baru Ini Selalu Aneh Tiap Malam Jumat, Warga Akhirnya Cari Tahu',
  'Anak Ini Diusir dari Rumah, 10 Tahun Kemudian Dia Kembali Membawa Kejutan',
  'Ibu Ini Rela Kerja Serabutan demi Anaknya Sekolah, Endingnya Bikin Haru',
  'Kejadian Aneh di Gang Sempit Ini Bikin Satu RT Gempar Semalaman',
]
const CS_THEMES = [
  'What-If Sejarah Nusantara', 'What-If Sejarah Dunia', 'What-If Tokoh Terkenal',
  'What-If Sains & Teknologi', 'What-If Perang & Konflik', 'What-If Bencana Alam',
]

async function pickCsTopic() {
  const theme = CS_THEMES[Math.floor(Math.random() * CS_THEMES.length)]
  const res = await fetch(`${BASE_URL}/api/topics/recommendations?theme=${encodeURIComponent(theme)}`, {
    headers: { 'x-api-secret': API_SECRET },
  })
  if (!res.ok) throw new Error(`topics/recommendations failed: ${res.status}`)
  const data = await res.json()
  const topic = data.topics?.[0]
  if (!topic) throw new Error('No topic returned')
  return { topic: `${topic} [THEME: ${theme}]` }
}

const delay = (ms) => new Promise(r => setTimeout(r, ms))

// Nunggu sampai channel ini BENER-BENER kelar (posted / failed / timeout) sebelum lanjut ke
// channel berikutnya — "render 1 1", biar gak ada 2 channel gambar-generate bareng (itu yang
// bikin Cloudflare 429 pas testing kemarin). Poll DB langsung, bukan API, lebih murah.
async function waitUntilDone(sql, projectId, label, timeoutMs = 45 * 60 * 1000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    let proj, upload, job
    try {
      ;[[proj], [upload], [job]] = await Promise.all([
        sql`SELECT status FROM projects WHERE id = ${projectId}`,
        sql`SELECT status FROM uploads WHERE project_id = ${projectId} ORDER BY created_at DESC LIMIT 1`,
        sql`SELECT status, error FROM render_jobs WHERE project_id = ${projectId} ORDER BY created_at DESC LIMIT 1`,
      ])
    } catch (e) {
      // ponytail: Neon kadang connection blip sesaat (pernah kejadian nyata) — retry, jangan
      // langsung nyerah, ini cuma polling, bukan operasi kritis.
      console.error(`[${label}] DB poll error (retry): ${e.message}`)
      await delay(45000)
      continue
    }

    if (upload) {
      console.log(`[${label}] SELESAI — sudah posted (upload status: ${upload.status}).`)
      return true
    }
    if (job?.status === 'failed') {
      console.error(`[${label}] Render GAGAL: ${job.error || '(no error message)'}`)
      return false
    }
    if (proj?.status === 'failed') {
      console.error(`[${label}] Project GAGAL di tahap AI pipeline.`)
      return false
    }
    console.log(`[${label}] masih proses... (project: ${proj?.status ?? '?'}, render: ${job?.status ?? 'belum mulai'})`)
    await delay(45000)
  }
  console.error(`[${label}] TIMEOUT setelah ${timeoutMs / 60000} menit, lanjut ke channel berikutnya.`)
  return false
}

async function run(channelId, dbUrl, getTopic) {
  const label = channelId || 'cabang-sejarah'
  console.log(`\n=== ${label} ===`)
  const { topic } = await getTopic()
  console.log(`Topic: ${topic}`)

  const headers = { 'Content-Type': 'application/json', 'x-api-secret': API_SECRET }
  if (channelId) headers['x-channel-id'] = channelId

  const createRes = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST', headers, body: JSON.stringify({ topic }),
  })
  const createData = await createRes.json()
  if (!createRes.ok) {
    console.error(`[${label}] Gagal buat project: ${createRes.status}`, createData)
    return
  }
  const projectId = createData.project.id
  console.log(`[${label}] Project dibuat: ${projectId}`)

  const sql = neon(dbUrl)
  await sql`UPDATE projects SET auto_publish = true WHERE id = ${projectId}`
  console.log(`[${label}] auto_publish=true diset — render selesai langsung publish.`)

  const pipelineRes = await fetch(`${BASE_URL}/api/projects/${projectId}/pipeline`, {
    method: 'POST', headers,
  })
  if (!pipelineRes.ok) {
    console.error(`[${label}] Gagal trigger pipeline: ${pipelineRes.status}`, await pipelineRes.text())
    return
  }
  console.log(`[${label}] AI Pipeline triggered, nunggu sampai selesai & posted...`)
  await waitUntilDone(sql, projectId, label)
}

async function main() {
  await run(undefined, process.env.DATABASE_URL, pickCsTopic)
  await run('brainwhy', process.env.DATABASE_URL_BRAINWHY, async () => ({
    topic: `${BW_TOPICS[Math.floor(Math.random() * BW_TOPICS.length)]} [THEME: Psychology & Behavior]`,
  }))
  await run('cerita-tetangga', process.env.DATABASE_URL_CERITA_TETANGGA, async () => ({
    topic: `${CT_TOPICS[Math.floor(Math.random() * CT_TOPICS.length)]} [THEME: Drama Keluarga]`,
  }))
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1) })
}

module.exports = { run, waitUntilDone, pickCsTopic, BW_TOPICS, CT_TOPICS }
