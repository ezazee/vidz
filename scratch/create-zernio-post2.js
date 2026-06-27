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
      process.env[key] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    }
  });
}
parseEnv();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query("SELECT key, value FROM integrations WHERE key IN ('zernio_api_key', 'youtube_account_id')");
  await client.end();
  const config = {};
  res.rows.forEach(r => { config[r.key] = r.value; });

  const url = `https://zernio.com/api/v1/posts`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.zernio_api_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: "Test Video 2",
      content: "Test description\n\n#test #youtube",
      platforms: [{ platform: 'youtube', accountId: config.youtube_account_id }],
      mediaItems: [
        { url: "https://example.com/video.mp4", type: "video" },
        { url: "https://example.com/thumb.jpg", type: "image" }
      ],
      publishNow: false
    })
  });
  console.log("Status:", response.status, response.statusText);
  const data = await response.json();
  console.log(data);
}
run().catch(console.error);
