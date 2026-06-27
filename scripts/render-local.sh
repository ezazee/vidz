#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  echo "Error: Tolong berikan ID Project."
  echo "Contoh: npm run render:local 123e4567-e89b-12d3-a456-426614174000"
  exit 1
fi

export PROJECT_ID=$1
export REMOTION_LOCAL_ASSETS=true

# Load environment variables from .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo "🚀 [1/5] Mengunduh naskah dari database..."
node scripts/fetch-storyboard.js

echo "🎬 [2/5] Mencari video Pexels..."
node scripts/fetch-pexels.js

echo "🎨 [3/5] Membuat gambar AI (jika Pexels tidak ada)..."
node scripts/generate-images.js

echo "🗣️ [4/5] Membuat suara Narator (Voiceover)..."
node scripts/generate-voices.js

echo "🎥 [5/5] Merender video akhir di Mac kamu..."
mkdir -p output
npx remotion render src/index.ts StoryZVideo output/final.mp4 --props=storyboard.json --concurrency=4 --timeout=120000

echo "✅ SELESAI! Video berhasil dibuat tanpa GitHub Actions!"
echo "Membuka video..."
open output/final.mp4
