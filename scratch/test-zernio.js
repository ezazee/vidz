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
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not found in env");
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  const res = await client.query("SELECT value FROM integrations WHERE key = 'zernio_api_key' LIMIT 1");
  await client.end();

  if (res.rows.length === 0) {
    console.error("Zernio API Key not found in database");
    return;
  }

  const zernioApiKey = res.rows[0].value;
  console.log("Found Zernio API Key:", zernioApiKey.slice(0, 6) + "...");

  const redirectUrl = "http://localhost:3000/api/integrations/youtube/callback";

  try {
    // Step 1: List profiles
    console.log("Fetching profiles from Zernio...");
    const profilesRes = await fetch("https://zernio.com/api/v1/profiles", {
      headers: {
        Authorization: `Bearer ${zernioApiKey}`
      }
    });
    
    console.log("Profiles status:", profilesRes.status, profilesRes.statusText);
    const profilesData = await profilesRes.json();
    
    let profileId = null;
    const profiles = profilesData.profiles || profilesData.data || (Array.isArray(profilesData) ? profilesData : []);
    
    if (profiles.length > 0) {
      profileId = profiles[0]._id || profiles[0].id || profiles[0].profileId;
      console.log("Using existing profile ID:", profileId);
    } else {
      // Step 2: Create a profile if none exists
      console.log("No profile found. Creating a new profile...");
      const createRes = await fetch("https://zernio.com/api/v1/profiles", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${zernioApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "StoryZ Studio"
        })
      });
      
      console.log("Create profile status:", createRes.status, createRes.statusText);
      const createData = await createRes.json();
      profileId = createData._id || createData.id || createData.profileId || (createData.data && (createData.data._id || createData.data.id));
    }

    if (!profileId) {
      console.error("Failed to obtain a Profile ID");
      return;
    }

    // Step 3: Get connection URL with profileId
    const connectUrlStr = `https://zernio.com/api/v1/connect/youtube?profileId=${profileId}&redirectUrl=${encodeURIComponent(redirectUrl)}`;
    console.log("Testing Connect URL with profileId:", connectUrlStr);
    const connectRes = await fetch(connectUrlStr, {
      headers: {
        Authorization: `Bearer ${zernioApiKey}`
      }
    });
    console.log("Connect status:", connectRes.status, connectRes.statusText);
    const connectData = await connectRes.json();
    console.log("Connect response:", JSON.stringify(connectData, null, 2));

  } catch (e) {
    console.error("Test execution failed:", e);
  }
}

run();
