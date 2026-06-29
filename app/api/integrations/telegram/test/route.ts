import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'

export async function POST() {
  const sql = getSql()
  const rows = await sql`SELECT key, value FROM integrations WHERE key IN ('telegram_bot_token', 'telegram_chat_id')`
  const config: Record<string, string> = {}
  for (const r of rows) config[r.key] = r.value

  const token = config.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN
  const chatId = config.telegram_chat_id || process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) return NextResponse.json({ error: 'Telegram belum dikonfigurasi' }, { status: 400 })

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: '✅ <b>StoryZ notifikasi aktif!</b>\n\nBot sudah terhubung. Kamu akan dapat notif otomatis setiap video selesai diupload ke YouTube. 🎬',
      parse_mode: 'HTML',
    }),
  })

  if (!res.ok) return NextResponse.json({ error: 'Gagal kirim notif ke Telegram' }, { status: 500 })
  return NextResponse.json({ success: true })
}
