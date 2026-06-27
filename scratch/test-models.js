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
  const baseUrl = process.env.AI_BASE_URL ?? process.env.NINE_ROUTER_BASE_URL;
  const apiKey = process.env.AI_API_KEY ?? process.env.NINE_ROUTER_API_KEY;

  console.log("Fetching models from:", baseUrl + "/models");
  const res = await fetch(baseUrl + "/models", {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  const data = await res.json();
  console.log("Available models:", data.data.map(m => m.id).join(', '));
}
run().catch(console.error);
