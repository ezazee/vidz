import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'

export async function GET(request: Request) {
  const sql = getSql()

  try {
    // 1. Ambil Zernio API Key dari database
    const rows = await sql`
      SELECT value FROM integrations WHERE key = 'zernio_api_key' LIMIT 1
    `

    if (rows.length === 0 || !rows[0].value) {
      return NextResponse.json({ error: 'Zernio API Key belum dikonfigurasi. Konfigurasikan di tab Integrasi terlebih dahulu.' }, { status: 400 })
    }

    const zernioApiKey = rows[0].value

    // 2. Tentukan redirect URL callback secara dinamis berdasarkan origin request
    const origin = new URL(request.url).origin
    const redirectUrl = `${origin}/api/integrations/youtube/callback`

    console.log(`Generating Zernio connect URL for YouTube with redirect: ${redirectUrl}`)

    // 3. Ambil atau buat Profile ID dari Zernio (organisasi akun)
    let profileId = ''
    let errorDetail = ''

    try {
      console.log('Fetching profiles from Zernio...')
      const profilesRes = await fetch('https://zernio.com/api/v1/profiles', {
        headers: {
          Authorization: `Bearer ${zernioApiKey}`,
        },
      })

      if (profilesRes.ok) {
        const profilesData = await profilesRes.json()
        const profiles = profilesData.profiles || profilesData.data || (Array.isArray(profilesData) ? profilesData : [])
        if (profiles.length > 0) {
          profileId = profiles[0]._id || profiles[0].id || profiles[0].profileId
          console.log(`Using existing Zernio profile: ${profileId}`)
        }
      }

      // Jika tidak ada profil, buat profil baru
      if (!profileId) {
        console.log('No profile found. Creating a new profile...')
        const createRes = await fetch('https://zernio.com/api/v1/profiles', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${zernioApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'StoryZ Studio' }),
        })
        if (createRes.ok) {
          const createData = await createRes.json()
          profileId = createData._id || createData.id || createData.profileId || (createData.data && (createData.data._id || createData.data.id))
          console.log(`Created new Zernio profile: ${profileId}`)
        } else {
          const errText = await createRes.text().catch(() => '')
          errorDetail = `Failed to create profile: ${createRes.status}. ${errText}`
        }
      }
    } catch (profileErr) {
      console.error('Error fetching/creating Zernio profile:', profileErr)
      errorDetail = `Profile error: ${profileErr instanceof Error ? profileErr.message : String(profileErr)}`
    }

    if (!profileId) {
      return NextResponse.json({ 
        error: `Gagal mendapatkan atau membuat profil di Zernio. Detail: ${errorDetail}` 
      }, { status: 500 })
    }

    // 4. Panggil Zernio API untuk mendapatkan URL koneksi menggunakan profileId
    let connectUrl = ''
    try {
      const connectUrlStr = `https://zernio.com/api/v1/connect/youtube?profileId=${profileId}&redirectUrl=${encodeURIComponent(redirectUrl)}`
      console.log(`Fetching connect URL: ${connectUrlStr}`)
      
      const connectRes = await fetch(connectUrlStr, {
        headers: {
          Authorization: `Bearer ${zernioApiKey}`,
        },
      })

      const connectData = await connectRes.json().catch(() => ({}))

      if (connectRes.ok) {
        connectUrl = connectData.url || connectData.connectUrl
      } else {
        // Berikan pesan kesalahan yang ramah dan mendetail dari Zernio (misal limit billing, dll)
        errorDetail = connectData.error || connectData.message || `${connectRes.status} ${connectRes.statusText}`
        console.error(`Zernio connection URL request failed: ${errorDetail}`)
      }
    } catch (apiErr) {
      console.error('Exception calling Zernio Connect API:', apiErr)
      errorDetail = apiErr instanceof Error ? apiErr.message : String(apiErr)
    }

    if (!connectUrl) {
      return NextResponse.json({ 
        error: `Gagal mendapatkan URL koneksi dari Zernio. Detail: ${errorDetail}` 
      }, { status: 500 })
    }

    return NextResponse.json({ url: connectUrl })
  } catch (error) {
    console.error('Error initiating YouTube connection:', error)
    return NextResponse.json({ error: 'Gagal memulai koneksi YouTube' }, { status: 500 })
  }
}
