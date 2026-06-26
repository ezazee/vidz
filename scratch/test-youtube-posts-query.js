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

  const zernioApiKey = config.zernio_api_key;
  const ytAccountId = config.youtube_account_id;

  // Test 1: Query by accountId
  try {
    const url = `https://zernio.com/api/v1/posts?accountId=${ytAccountId}&limit=10`;
    console.log(`Testing GET: ${url}`);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${zernioApiKey}` }
    });
    const data = await response.json();
    console.log("Account ID query status:", response.status);
    console.log("Total posts found:", data.posts ? data.posts.length : 0);
    if (data.posts && data.posts.length > 0) {
      console.log("First post platforms:", data.posts[0].platforms.map(p => p.platform));
    }
  } catch (e) {
    console.error("Test 1 failed:", e);
  }

  // Test 2: Query by platform
  try {
    const url = `https://zernio.com/api/v1/posts?platform=youtube&limit=10`;
    console.log(`\nTesting GET: ${url}`);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${zernioApiKey}` }
    });
    const data = await response.json();
    console.log("Platform query status:", response.status);
    console.log("Total posts found:", data.posts ? data.posts.length : 0);
    if (data.posts && data.posts.length > 0) {
      console.log("First post platforms:", data.posts[0].platforms.map(p => p.platform));
    }
  } catch (e) {
    console.error("Test 2 failed:", e);
  }
}

run().catch(console.error);
