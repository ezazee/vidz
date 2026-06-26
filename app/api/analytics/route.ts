import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'

export async function GET() {
  const sql = getSql()

  try {
    // 1. Ambil data dasar analitik platform dari database
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
    const platformCost = 0.00

    // 2. Periksa apakah Zernio & YouTube terhubung untuk mengambil metrik riil YouTube
    let youtubeStats = null
    let youtubeConnected = false

    try {
      const integrations = await sql`
        SELECT key, value FROM integrations 
        WHERE key IN ('zernio_api_key', 'youtube_account_id')
      `
      const config: Record<string, string> = {}
      for (const row of integrations) {
        config[row.key] = row.value
      }

      if (config.zernio_api_key && config.youtube_account_id) {
        youtubeConnected = true
        console.log(`Querying Zernio YouTube analytics for account: ${config.youtube_account_id}...`)

        // Panggil Zernio Analytics API secara aman (fault-isolated)
        // Jika API Zernio gagal, halaman analitik internal platform tetap terbuka sukses
        const zernioRes = await fetch(`https://zernio.com/api/v1/accounts/${config.youtube_account_id}/analytics`, {
          headers: {
            Authorization: `Bearer ${config.zernio_api_key}`,
          },
        })

        if (zernioRes.ok) {
          const data = await zernioRes.json()
          const stats = data.analytics || data.data || {}
          
          // Mengambil metrik dengan fallback untuk berbagai format kembalian Zernio
          youtubeStats = {
            subscribers: stats.subscribers ?? stats.followers ?? stats.subscriberCount ?? 0,
            views: stats.views ?? stats.impressions ?? stats.viewCount ?? 0,
            watchTimeSeconds: stats.watchTime ?? stats.watchTimeSeconds ?? 0,
            likes: stats.likes ?? stats.likeCount ?? 0,
          }
          console.log('Successfully retrieved YouTube metrics:', youtubeStats)
        } else {
          console.error(`Zernio analytics API returned error: ${zernioRes.status} ${zernioRes.statusText}`)
        }
      }
    } catch (dbOrApiErr) {
      const errMsg = dbOrApiErr instanceof Error ? dbOrApiErr.message : String(dbOrApiErr)
      console.error('Failed to retrieve YouTube analytics from Zernio:', errMsg)
    }

    return NextResponse.json({
      analytics: {
        totalProjects,
        totalCompleted,
        totalRenderTime,
        timeSavedSeconds,
        platformCost,
        statusBreakdown,
        youtubeConnected,
        youtubeStats,
      }
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
