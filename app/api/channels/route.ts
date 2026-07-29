import { NextResponse } from 'next/server'
import { getChannel, type ChannelId } from '@/lib/channels'

export const dynamic = 'force-dynamic'

const CHANNEL_IDS: ChannelId[] = ['cabang-sejarah', 'brainwhy', 'cerita-tetangga']

/**
 * GET /api/channels — identitas tiap channel untuk halaman Channels.
 *
 * Sengaja hanya memilih field yang aman ditampilkan (nama, bahasa, kategori,
 * platform, gaya). Prompt persona, aturan image, dan apa pun yang menyentuh
 * env TIDAK ikut dikirim ke browser.
 */
export async function GET() {
  const channels = CHANNEL_IDS.map((id) => {
    const c = getChannel(id)
    return {
      id: c.id,
      name: c.name,
      tagline: c.tagline,
      language: c.language,
      platform: c.publishPlatform ?? 'youtube',
      titlePrefix: c.titlePrefix,
      mascotName: c.mascotName,
      thumbnailStyle: c.thumbnailStyle,
      categories: c.categories,
      openingStyleCount: c.openingStyles.length,
      fallbackTopics: c.fallbackTopics,
    }
  })

  return NextResponse.json({ channels })
}
