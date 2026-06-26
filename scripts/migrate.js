const fs = require('fs')
const path = require('path')
const { neon } = require('@neondatabase/serverless')

// Helper untuk membaca file .env secara manual
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '../.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
        if (match) {
          const key = match[1]
          let value = match[2] || ''
          // Hapus tanda kutip jika ada
          if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
            value = value.substring(1, value.length - 1)
          }
          if (!process.env[key]) {
            process.env[key] = value
          }
        }
      })
    }
  } catch (e) {
    console.warn('Warning: Failed to load .env file manually:', e.message)
  }
}

async function main() {
  loadEnv()
  
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not configured in environment variables or .env file')
  }

  const sql = neon(dbUrl)
  console.log('Running DDL migration to create integrations table...')
  
  await sql`
    CREATE TABLE IF NOT EXISTS integrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  
  console.log('Migration completed successfully!')
}

main().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
