// ponytail: resume run — CS project udah ada & jalan (dibuat trigger-all-now.js sebelumnya,
// script itu mati di tengah polling gara-gara Neon connection blip, bukan gara-gara pipeline-nya
// gagal). Tunggu CS itu kelar dulu, baru trigger BW lalu CT, tetap satu-satu.
require('dotenv').config()
const { neon } = require('@neondatabase/serverless')
const { run, waitUntilDone, BW_TOPICS, CT_TOPICS } = require('./trigger-all-now')

const CS_PROJECT_ID = 'b32702f5-9a34-4c5d-aeba-bcb3de43e42e'

async function main() {
  console.log('=== cabang-sejarah (resume, project sudah ada) ===')
  const sqlCs = neon(process.env.DATABASE_URL)
  await waitUntilDone(sqlCs, CS_PROJECT_ID, 'cabang-sejarah')

  await run('brainwhy', process.env.DATABASE_URL_BRAINWHY, async () => ({
    topic: `${BW_TOPICS[Math.floor(Math.random() * BW_TOPICS.length)]} [THEME: Psychology & Behavior]`,
  }))
  await run('cerita-tetangga', process.env.DATABASE_URL_CERITA_TETANGGA, async () => ({
    topic: `${CT_TOPICS[Math.floor(Math.random() * CT_TOPICS.length)]} [THEME: Drama Keluarga]`,
  }))
}

main().catch(e => { console.error(e); process.exit(1) })
