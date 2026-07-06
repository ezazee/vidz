import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verifikasi Cron Secret dari Vercel
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const sql = getSql()
  const baseUrl = new URL(request.url).origin
  
  try {
    // 1. Cari jadwal yang jatuh tempo
    const dueSchedules = await sql`
      SELECT * FROM auto_schedules
      WHERE is_active = true
      AND (next_run_at IS NULL OR next_run_at <= NOW())
    `

    if (dueSchedules.length === 0) {
      return NextResponse.json({ message: 'No due schedules' })
    }

    console.log(`[Cron] Found ${dueSchedules.length} due schedules`)

    for (const schedule of dueSchedules) {
      console.log(`[Cron] Processing schedule: ${schedule.id} (Theme: ${schedule.theme})`)
      
      // 2. Hitung waktu lari berikutnya (dalam WIB UTC+7)
      const [hours, minutes] = schedule.time_of_day.split(':').map(Number)
      const wibOffset = 7 * 60 * 60 * 1000
      const nowWib = new Date(Date.now() + wibOffset)
      const allowedDays = schedule.days_of_week ? schedule.days_of_week.split(',').map(Number) : [0,1,2,3,4,5,6]
      const currentDayWib = nowWib.getUTCDay()

      let nextRunWib = new Date(nowWib)
      nextRunWib.setUTCHours(hours, minutes, 0, 0)

      // Cari hari berikutnya yang valid
      if (!allowedDays.includes(currentDayWib) || nextRunWib <= nowWib) {
        let daysToAdd = allowedDays.includes(currentDayWib) && nextRunWib <= nowWib ? 1 : 0
        while (daysToAdd <= 7) {
          const nextDay = (currentDayWib + daysToAdd) % 7
          if (allowedDays.includes(nextDay) && daysToAdd > 0) break
          daysToAdd++
        }
        nextRunWib.setUTCDate(nextRunWib.getUTCDate() + daysToAdd)
      }

      const nextRun = new Date(nextRunWib.getTime() - wibOffset)

      await sql`
        UPDATE auto_schedules
        SET next_run_at = ${nextRun.toISOString()}, last_run_at = NOW()
        WHERE id = ${schedule.id}
      `

      // 3. Hasilkan topik spesifik menggunakan AI berdasarkan tema besar
      let specificTopic = schedule.theme
      try {
        const { chat } = await import('@/lib/ai/client')
        const generated = await chat([
          { role: 'system', content: 'Kamu adalah pembuat topik video "what-if" sejarah alternatif untuk channel YouTube Cabang Sejarah. Output HANYA judul topik, tanpa tanda kutip, tanpa penjelasan.' },
          { role: 'user', content: `Tema: "${schedule.theme}". Buat SATU judul skenario "Bagaimana Jika..." yang spesifik, viral, dan bikin penasaran dalam bahasa Indonesia. Judul WAJIB diawali "Bagaimana Jika". Maksimal 12 kata.` }
        ], false)
        if (generated?.trim()) specificTopic = generated.trim().replace(/^["']|["']$/g, '')
      } catch (e) {
        console.error('[Cron] Failed to generate specific topic with AI, falling back to theme', e)
      }
      
      console.log(`[Cron] Generated topic: ${specificTopic}`)

      // 4. Buat Proyek Baru dan tandai auto_publish
      const projectRes = await sql`
        INSERT INTO projects (user_id, topic, status, auto_publish)
        VALUES ('00000000-0000-0000-0000-000000000000', ${specificTopic}, 'draft', ${schedule.auto_publish})
        RETURNING id
      `
      const projectId = projectRes[0].id
      console.log(`[Cron] Created project ${projectId}`)

      // 5. Picu pipeline
      try {
        let fetchUrl = `${baseUrl}/api/projects/${projectId}/pipeline`
        if (fetchUrl.includes('localhost')) fetchUrl = fetchUrl.replace('localhost', '127.0.0.1')
        
        await fetch(fetchUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-secret': process.env.API_SECRET || '' }
        })
        console.log(`[Cron] Pipeline triggered for ${projectId}`)
      } catch (err) {
        console.error(`[Cron] Failed to trigger pipeline for ${projectId}:`, err)
      }
    }

    return NextResponse.json({ success: true, processed: dueSchedules.length })
  } catch (error) {
    console.error('[Cron] Tick error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
