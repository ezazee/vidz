const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

function loadEnv() {
  try {
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
            value = value.substring(1, value.length - 1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  } catch (e) {
    console.warn('Warning: Failed to load .env file manually:', e.message);
  }
}

async function main() {
  loadEnv();
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  const sql = neon(dbUrl);
  console.log('Altering render_jobs table to add github_run_id...');
  
  await sql`
    ALTER TABLE render_jobs 
    ADD COLUMN IF NOT EXISTS github_run_id VARCHAR(255)
  `;
  
  console.log('Column github_run_id successfully added to render_jobs!');
}

main().catch(console.error);
