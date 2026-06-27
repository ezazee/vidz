require('dotenv').config();
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);

async function main() {
  const scenes = await sql`
    SELECT project_id, pexels_query, pexels_video_urls, image_prompt 
    FROM scenes 
    ORDER BY id DESC 
    LIMIT 20
  `;
  console.log(JSON.stringify(scenes, null, 2));
  process.exit(0);
}
main();
