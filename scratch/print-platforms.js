const { Client } = require('pg');
const fs = require('fs');

function parseEnv() {
  if (!fs.existsSync('.env')) return;
  const content = fs.readFileSync('.env', 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let val = parts.slice(1).join('=').trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      if (val.startsWith("'") && val.endsWith("'")) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
}

parseEnv();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  const res = await client.query("SELECT key, value FROM integrations WHERE key IN ('zernio_api_key', 'youtube_account_id')");
  await client.end();

  const config = {};
  res.rows.forEach(r => { config[r.key] = r.value; });

  const url = `https://zernio.com/api/v1/posts?limit=100`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.zernio_api_key}` }
  });

  const data = await response.json();
  const posts = data.posts || data.data || [];
  
  console.log(`Fetched ${posts.length} posts:`);
  posts.forEach((p, idx) => {
    const platforms = p.platforms ? p.platforms.map(pf => pf.platform).join(", ") : "none";
    console.log(`${idx + 1}. Title: "${p.content.substring(0, 40).replace(/\n/g, ' ')}..." | Platforms: [${platforms}]`);
  });
}

run().catch(console.error);
