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
      
      // 2. Hitung waktu lari berikutnya
      const [hours, minutes] = schedule.time_of_day.split(':').map(Number)
      const now = new Date()
      let nextRun = new Date(now)
      nextRun.setHours(hours, minutes, 0, 0)
      
      const allowedDays = schedule.days_of_week ? schedule.days_of_week.split(',').map(Number) : [0,1,2,3,4,5,6]
      const currentDay = now.getDay()
      
      if (allowedDays.includes(currentDay) && nextRun > now) {
        // Run today at the specified time
      } else {
        let daysToAdd = 1
        while (daysToAdd <= 7) {
          const nextDay = (currentDay + daysToAdd) % 7
          if (allowedDays.includes(nextDay)) {
            break
          }
          daysToAdd++
        }
        nextRun.setDate(nextRun.getDate() + daysToAdd)
      }

      await sql`
        UPDATE auto_schedules
        SET next_run_at = ${nextRun.toISOString()}, last_run_at = NOW()
        WHERE id = ${schedule.id}
      `

      // 3. Hasilkan topik spesifik menggunakan AI berdasarkan tema besar
      let specificTopic = schedule.theme
      if (process.env.AI_BASE_URL && process.env.AI_API_KEY) {
        try {
          const aiRes = await fetch(`${process.env.AI_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.AI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: process.env.AI_MODEL || 'gpt-4o-mini',
              messages: [{
                role: 'system',
                content: `Kamu adalah asisten pembuat topik YouTube Shorts dokumenter yang viral. Tema besar yang diminta adalah: "${schedule.theme}". Berikan SATU judul/topik spesifik (maksimal 5 kata) yang menarik, unik, dan sedikit misterius. Langsung jawab dengan topiknya, tanpa tanda kutip, tanpa penjelasan.`
              }]
            })
          })
          if (aiRes.ok) {
            const aiData = await aiRes.json()
            const generatedTopic = aiData.choices[0]?.message?.content?.trim()
            if (generatedTopic) {
              specificTopic = generatedTopic.replace(/"/g, '')
            }
          }
        } catch (e) {
          console.error('[Cron] Failed to generate specific topic with AI, falling back to theme', e)
        }
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
          headers: { 'Content-Type': 'application/json' }
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
