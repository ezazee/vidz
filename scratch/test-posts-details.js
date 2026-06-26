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

  // Fetch more posts to find YouTube ones and check their structure
  const url = `https://zernio.com/api/v1/posts?limit=30`;
  console.log(`Calling Zernio Posts API: ${url}...`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.zernio_api_key}`
    }
  });

  const data = await response.json();
  const posts = data.posts || data.data || [];
  
  // Find a post that has a youtube platform
  const ytPost = posts.find(p => p.platforms && p.platforms.some(pf => pf.platform === 'youtube'));
  
  if (ytPost) {
    console.log("\nFound YouTube Post:");
    console.log(JSON.stringify(ytPost, null, 2));
  } else {
    console.log("\nNo YouTube Post found in the last 30 posts, printing first post instead:");
    if (posts.length > 0) {
      console.log(JSON.stringify(posts[0], null, 2));
    } else {
      console.log("No posts found at all.");
    }
  }
}

run().catch(console.error);
