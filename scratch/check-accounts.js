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
  const res = await client.query("SELECT * FROM integrations");
  await client.end();

  console.log("Database Integrations table content:");
  console.log(res.rows);

  const keyRow = res.rows.find(r => r.key === 'zernio_api_key');
  if (!keyRow) {
    console.log("No Zernio API key found in DB");
    return;
  }

  const zernioApiKey = keyRow.value;

  console.log("\nCalling Zernio GET /accounts...");
  const accountsRes = await fetch("https://zernio.com/api/v1/accounts", {
    headers: {
      Authorization: `Bearer ${zernioApiKey}`
    }
  });

  console.log("Status:", accountsRes.status, accountsRes.statusText);
  const accountsData = await accountsRes.json();
  console.log("Accounts response:", JSON.stringify(accountsData, null, 2));
}

run().catch(console.error);
