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

  if (!config.zernio_api_key || !config.youtube_account_id) {
    console.error("Missing credentials in DB:", config);
    return;
  }

  const url = `https://zernio.com/api/v1/accounts/${config.youtube_account_id}/analytics`;
  console.log(`Calling Zernio Analytics API: ${url}...`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.zernio_api_key}`
    }
  });

  console.log("Status:", response.status, response.statusText);
  const data = await response.json();
  console.log("Response data:", JSON.stringify(data, null, 2));
}

run().catch(console.error);
