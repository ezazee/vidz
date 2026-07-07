import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'

export async function GET() {
  const sql = getSql()

  try {
    // 1. Data dasar dari database
    const totalProjectsRes = await sql`
      SELECT text(COUNT(*)) as count FROM projects
    `
    const totalProjects = parseInt(totalProjectsRes[0]?.count ?? '0', 10)

    const completedJobsRes = await sql`
      SELECT text(COUNT(*)) as count FROM render_jobs WHERE status = 'completed'
    `
    const totalCompleted = parseInt(completedJobsRes[0]?.count ?? '0', 10)

    const renderTimeRes = await sql`
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (completed_at - started_at)))::integer, 0) as total_seconds
      FROM render_jobs
      WHERE status = 'completed' AND completed_at IS NOT NULL AND started_at IS NOT NULL
    `
    const totalRenderTime = renderTimeRes[0]?.total_seconds ?? 0

    const statusBreakdownRes = await sql`
      SELECT status, text(COUNT(*)) as count
      FROM render_jobs
      GROUP BY status
    `
    const statusBreakdown: Record<string, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    }
    for (const row of statusBreakdownRes) {
      statusBreakdown[row.status] = parseInt(row.count, 10)
    }

    const timeSavedSeconds = totalCompleted * 2280
    const platformCost = 0.0

    // 2. Riwayat upload lokal
    const localUploads = await sql`
      SELECT
        p.id as project_id,
        p.topic as title,
        u.youtube_url,
        u.youtube_id,
        u.status as upload_status,
        u.created_at
      FROM uploads u
      JOIN projects p ON u.project_id = p.id
      ORDER BY u.created_at DESC
    `

    // 3. Live stats dari Zernio — selalu cari akun YouTube TERKINI dari API,
    //    bukan mengandalkan youtube_account_id lama di DB (bisa basi kalau ganti akun Zernio)
    let youtubeStats = null
    let youtubeConnected = false
    let youtubeChannelName: string | null = null
    let youtubeChannelThumbnail = ''

    try {
      const integrations = await sql`
        SELECT key, value FROM integrations
        WHERE key IN ('zernio_api_key', 'youtube_account_id')
      `
      const config: Record<string, string> = {}
      for (const row of integrations) {
        config[row.key] = row.value
      }

      if (config.zernio_api_key) {
        const zernioRes = await fetch('https://zernio.com/api/v1/accounts', {
          headers: { Authorization: `Bearer ${config.zernio_api_key}` },
        })

        if (zernioRes.ok) {
          const data = await zernioRes.json()
          const accounts = data.accounts || data.data || (Array.isArray(data) ? data : [])

          // Prioritas: id tersimpan → kalau tidak ketemu (akun ganti), cari platform youtube
          let match = accounts.find((acc: any) => String(acc.id || acc._id) === String(config.youtube_account_id))
          if (!match) {
            match = accounts.find((acc: any) => String(acc.platform || acc.type).toLowerCase() === 'youtube')
            // Akun berubah — perbarui cache di DB supaya publish & UI ikut akun baru
            if (match) {
              const newId = String(match.id || match._id)
              const newName = match.name || match.displayName || match.username || 'YouTube Channel'
              const newThumb = match.avatar || match.picture || match.thumbnail || ''
              console.log(`Analytics: youtube_account_id basi, re-sync ke akun baru ${newName} (${newId})`)
              await sql`INSERT INTO integrations (key, value) VALUES ('youtube_account_id', ${newId}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`
              await sql`INSERT INTO integrations (key, value) VALUES ('youtube_channel_name', ${newName}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`
              if (newThumb) {
                await sql`INSERT INTO integrations (key, value) VALUES ('youtube_channel_thumbnail', ${newThumb}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`
              }
            }
          }

          if (match) {
            youtubeConnected = true
            youtubeChannelName = match.name || match.displayName || match.username || 'YouTube Channel'
            youtubeChannelThumbnail = match.avatar || match.picture || match.thumbnail || ''

            const profileData = match.metadata?.profileData || {}
            const extraData = profileData.extraData || {}

            youtubeStats = {
              subscribers: match.followersCount ?? profileData.followersCount ?? 0,
              views: extraData.totalViews ?? extraData.viewsCount ?? 0,
              videoCount: extraData.videoCount ?? extraData.postsCount ?? 0,
              likes: extraData.likesCount ?? extraData.totalLikes ?? 0,
              comments: extraData.commentsCount ?? extraData.totalComments ?? 0,
              watchTimeSeconds: extraData.watchTimeSeconds ?? 0,
              engagementRate: 0,
            }
          }
        }
      }
    } catch (dbOrApiErr) {
      const errMsg = dbOrApiErr instanceof Error ? dbOrApiErr.message : String(dbOrApiErr)
      console.error('Failed to retrieve YouTube analytics from Zernio:', errMsg)
    }

    // 4. Post terbaru: hanya data upload asli dari aplikasi ini — tanpa data pajangan/acak
    const recentPosts = localUploads.map((lu: any) => ({
      id: lu.youtube_id || lu.project_id,
      title: (lu.title || '').replace(/\s*\[THEME:.*?\]\s*/gi, ''),
      tags: ['CabangSejarah', 'WhatIf'],
      date: new Date(lu.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      likes: null,
      views: null,
      reach: 0,
      url: lu.youtube_url || '#',
    }))

    return NextResponse.json({
      analytics: {
        totalProjects,
        totalCompleted,
        totalRenderTime,
        timeSavedSeconds,
        platformCost,
        statusBreakdown,
        youtubeConnected,
        youtubeChannelName,
        youtubeChannelThumbnail,
        youtubeStats,
        recentPosts,
      },
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

export const maxDuration = 60
