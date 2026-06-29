import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'

// Helper function to sync YouTube account from Zernio
async function syncYouTubeAccount(sql: any, zernioApiKey: string) {
  try {
    console.log('Syncing YouTube accounts from Zernio...')
    const res = await fetch('https://zernio.com/api/v1/accounts', {
      headers: {
        Authorization: `Bearer ${zernioApiKey}`,
      },
    })

    if (!res.ok) {
      console.error(`Failed to fetch accounts from Zernio during sync: ${res.status}`)
      return null
    }

    const data = await res.json()
    const accounts = data.accounts || data.data || (Array.isArray(data) ? data : [])
    
    // Temukan akun YouTube
    const match = accounts.find((acc: any) => 
      acc.platform === 'youtube' || 
      acc.type === 'youtube' || 
      String(acc.platform).toLowerCase() === 'youtube'
    )

    if (match) {
      const accountId = String(match.id || match._id)
      const channelName = match.name || match.displayName || match.username || 'YouTube Channel'
      const channelThumbnail = match.avatar || match.picture || match.thumbnail || ''

      console.log(`Found YouTube account on Zernio during sync: ${channelName} (${accountId})`)

      // Simpan ke database
      await sql`
        INSERT INTO integrations (key, value)
        VALUES ('youtube_account_id', ${accountId})
        ON CONFLICT (key) 
        DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `

      await sql`
        INSERT INTO integrations (key, value)
        VALUES ('youtube_channel_name', ${channelName})
        ON CONFLICT (key) 
        DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `

      if (channelThumbnail) {
        await sql`
          INSERT INTO integrations (key, value)
          VALUES ('youtube_channel_thumbnail', ${channelThumbnail})
          ON CONFLICT (key) 
          DO UPDATE SET value = EXCLUDED.value, updated_at = now()
        `
      }

      return {
        youtubeAccountId: accountId,
        youtubeChannelName: channelName,
        youtubeChannelThumbnail: channelThumbnail || null,
      }
    }
  } catch (err) {
    console.error('Error during Zernio YouTube account sync:', err)
  }
  return null
}

export async function GET() {
  const sql = getSql()

  try {
    const rows = await sql`
      SELECT key, value FROM integrations
      WHERE key IN (
        'zernio_api_key', 
        'youtube_account_id', 
        'youtube_channel_name', 
        'youtube_channel_thumbnail'
      )
    `

    // Map rows to a clean config object
    const config: Record<string, string> = {}
    for (const row of rows) {
      config[row.key] = row.value
    }

    let zernioConnected = !!config.zernio_api_key
    let youtubeConnected = !!config.youtube_account_id
    let youtubeChannelName = config.youtube_channel_name || null
    let youtubeChannelThumbnail = config.youtube_channel_thumbnail || null
    let youtubeAccountId = config.youtube_account_id || null

    // Auto-sync jika Zernio terhubung tetapi akun YouTube belum terdeteksi secara lokal
    if (zernioConnected && !youtubeConnected) {
      const synced = await syncYouTubeAccount(sql, config.zernio_api_key)
      if (synced) {
        youtubeConnected = true
        youtubeAccountId = synced.youtubeAccountId
        youtubeChannelName = synced.youtubeChannelName
        youtubeChannelThumbnail = synced.youtubeChannelThumbnail
      }
    }

    // Mask the Zernio API key for security
    let maskedKey = ''
    if (config.zernio_api_key) {
      const len = config.zernio_api_key.length
      maskedKey = config.zernio_api_key.slice(0, 6) + '...' + config.zernio_api_key.slice(len - 4)
    }

    return NextResponse.json({
      zernioConnected,
      youtubeConnected,
      zernioApiKey: maskedKey,
      youtubeChannelName,
      youtubeChannelThumbnail,
      youtubeAccountId,
    })
  } catch (error) {
    console.error('Error fetching integrations:', error)
    return NextResponse.json({ error: 'Gagal mengambil status integrasi' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const sql = getSql()

  try {
    const body = await request.json()
    const { zernio_api_key, telegram_bot_token, telegram_chat_id } = body

    // Save Telegram
    if (telegram_bot_token && telegram_chat_id) {
      await sql`INSERT INTO integrations (key, value) VALUES ('telegram_bot_token', ${telegram_bot_token.trim()}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`
      await sql`INSERT INTO integrations (key, value) VALUES ('telegram_chat_id', ${telegram_chat_id.trim()}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`
      return NextResponse.json({ message: 'Telegram berhasil disimpan' })
    }

    if (!zernio_api_key || zernio_api_key.trim() === '') {
      return NextResponse.json({ error: 'Zernio API Key wajib diisi' }, { status: 400 })
    }

    const trimmedKey = zernio_api_key.trim()
    await sql`
      INSERT INTO integrations (key, value)
      VALUES ('zernio_api_key', ${trimmedKey})
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `

    const synced = await syncYouTubeAccount(sql, trimmedKey)
    return NextResponse.json({ message: 'Zernio API Key berhasil disimpan', youtubeSynced: !!synced })
  } catch (error) {
    console.error('Error saving integration:', error)
    return NextResponse.json({ error: 'Gagal menyimpan' }, { status: 500 })
  }
}
