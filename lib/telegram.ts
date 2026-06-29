import { getSql } from '@/lib/db/client'

export async function sendTelegram(message: string): Promise<void> {
  let token = process.env.TELEGRAM_BOT_TOKEN
  let chatId = process.env.TELEGRAM_CHAT_ID

  // Fallback: ambil dari DB
  if (!token || !chatId) {
    try {
      const sql = getSql()
      const rows = await sql`SELECT key, value FROM integrations WHERE key IN ('telegram_bot_token', 'telegram_chat_id')`
      for (const r of rows) {
        if (r.key === 'telegram_bot_token') token = r.value
        if (r.key === 'telegram_chat_id') chatId = r.value
      }
    } catch {}
  }

  if (!token || !chatId) return

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
  }).catch(() => {})
}
