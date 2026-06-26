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

  if (!config.zernio_api_key) {
    console.error("Missing Zernio API key");
    return;
  }

  const url = `https://zernio.com/api/v1/posts?limit=100`;
  console.log(`Calling Zernio Posts API (limit 100): ${url}...`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.zernio_api_key}`
    }
  });

  const data = await response.json();
  const posts = data.posts || data.data || [];
  
  console.log(`Total posts fetched: ${posts.length}`);
  
  const ytPosts = posts.filter(p => p.platforms && p.platforms.some(pf => pf.platform === 'youtube'));
  console.log(`Total YouTube posts found: ${ytPosts.length}`);
  
  if (ytPosts.length > 0) {
    console.log("\nPrinting first YouTube post platforms structure:");
    const firstYt = ytPosts[0];
    const ytPlatform = firstYt.platforms.find(pf => pf.platform === 'youtube');
    console.log(JSON.stringify(ytPlatform, null, 2));
  } else {
    console.log("No YouTube posts found in the last 100 posts.");
  }
}

run().catch(console.error);
