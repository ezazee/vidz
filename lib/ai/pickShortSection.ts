import { chat } from './client'
import { getChannel, type ChannelId } from '@/lib/channels'

export interface ShortCandidate {
  index: number
  title: string
  narration: string
}

// Pilih 1 chapter paling "hook"/emosional/ada twist buat dijadikan short 30-90 detik —
// reuse chapter yang sudah ditulis, bukan generate ulang, biar murah (1 AI call teks pendek).
export async function pickShortSection(topic: string, candidates: ShortCandidate[], channelId?: ChannelId): Promise<number> {
  if (candidates.length === 0) return 0
  if (candidates.length === 1) return candidates[0].index

  const channel = getChannel(channelId)
  const isEn = channel.language === 'en'
  const listText = candidates
    .map((c) => `${c.index}. "${c.title}"\n${c.narration.slice(0, 600)}`)
    .join('\n\n')

  const prompt = isEn
    ? `Pick ONE chapter from this video about "${topic}" that works best as a standalone 30-90 second short/reel — most emotional, hook-worthy, or has the biggest twist on its own without needing the rest of the video for context.\n\n${listText}\n\nRespond with ONLY the chapter index number, nothing else.`
    : `Pilih SATU chapter dari video tentang "${topic}" ini yang paling cocok jadi short/reels 30-90 detik berdiri sendiri — paling emosional, hook, atau ada twist, dan bisa dipahami tanpa perlu konteks video lainnya.\n\n${listText}\n\nJawab HANYA dengan angka index chapter-nya, tanpa teks lain.`

  try {
    const content = await chat([
      { role: 'system', content: 'You pick the best short-form clip candidate. Respond with only a single number, nothing else.' },
      { role: 'user', content: prompt },
    ], false)
    const match = content.match(/\d+/)
    const picked = match ? parseInt(match[0], 10) : NaN
    return candidates.some((c) => c.index === picked) ? picked : candidates[0].index
  } catch (err) {
    console.error('[pickShortSection] AI gagal, fallback ke chapter pertama:', err)
    return candidates[0].index
  }
}
