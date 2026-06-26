import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sql = getSql()

  // Zernio biasanya mengirimkan accountId, connectionId, atau id saat pengalihan
  const accountId = searchParams.get('accountId') || searchParams.get('connectionId') || searchParams.get('id')
  const status = searchParams.get('status')

  if (!accountId) {
    console.error('Callback error: Missing account ID in query parameters', request.url)
    return NextResponse.redirect(new URL('/?tab=integrations&error=missing_account_id', request.url))
  }

  if (status === 'failed') {
    console.error('Callback error: Zernio OAuth connection failed', request.url)
    return NextResponse.redirect(new URL('/?tab=integrations&error=oauth_failed', request.url))
  }

  try {
    // 1. Ambil Zernio API Key dari database untuk melakukan query detail akun
    const rows = await sql`
      SELECT value FROM integrations WHERE key = 'zernio_api_key' LIMIT 1
    `
    if (rows.length === 0 || !rows[0].value) {
      throw new Error('Zernio API Key is not configured')
    }
    const zernioApiKey = rows[0].value

    // 2. Ambil detail akun secara server-side dari Zernio API
    // Kami akan mengambil daftar seluruh akun terhubung dan mencari ID yang cocok
    let channelName = 'YouTube Channel'
    let channelThumbnail = ''

    try {
      console.log(`Fetching account details from Zernio for accountId: ${accountId}`)
      const res = await fetch('https://zernio.com/api/v1/accounts', {
        headers: {
          Authorization: `Bearer ${zernioApiKey}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        const accounts = data.accounts || data.data || []
        const match = accounts.find((acc: any) => String(acc.id) === String(accountId))
        
        if (match) {
          channelName = match.name || match.displayName || match.username || channelName
          channelThumbnail = match.avatar || match.picture || match.thumbnail || channelThumbnail
          console.log(`Successfully matched YouTube channel: ${channelName}`)
        } else {
          console.warn(`Account ID ${accountId} not found in Zernio accounts list. Using placeholders.`)
        }
      } else {
        console.error(`Failed to fetch accounts list from Zernio: ${res.status} ${res.statusText}`)
      }
    } catch (apiErr) {
      console.error('Exception fetching details from Zernio:', apiErr)
    }

    // 3. Simpan detail akun YouTube ke tabel integrations
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

    console.log(`YouTube channel ${channelName} successfully integrated!`)

    // 4. Redirect kembali ke tab Integrasi di halaman utama
    return NextResponse.redirect(new URL('/?tab=integrations&success=youtube_connected', request.url))
  } catch (error) {
    console.error('Error handling YouTube connection callback:', error)
    return NextResponse.redirect(new URL('/?tab=integrations&error=callback_processing_failed', request.url))
  }
}
