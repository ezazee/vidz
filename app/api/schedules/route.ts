import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'
import { z } from 'zod'

const createScheduleSchema = z.object({
  theme: z.string().min(1),
  days_of_week: z.string().min(1), // e.g. "0,1,2,3,4,5,6"
  time_of_day: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  auto_publish: z.boolean().default(true),
})

export async function GET() {
  const sql = getSql()
  try {
    const rows = await sql`
      SELECT * FROM auto_schedules 
      ORDER BY created_at DESC
    `
    return NextResponse.json({ schedules: rows })
  } catch (error) {
    console.error('Error fetching schedules:', error)
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const sql = getSql()
  try {
    const body = createScheduleSchema.parse(await request.json())
    
    // Calculate first run in WIB (UTC+7)
    const [hours, minutes] = body.time_of_day.split(':').map(Number)
    const nowUtc = new Date()
    const wibOffset = 7 * 60 * 60 * 1000
    const nowWib = new Date(nowUtc.getTime() + wibOffset)
    const nextRunWib = new Date(nowWib)
    nextRunWib.setUTCHours(hours, minutes, 0, 0)
    if (nextRunWib <= nowWib) nextRunWib.setUTCDate(nextRunWib.getUTCDate() + 1)
    // Convert back to UTC for storage
    const nextRun = new Date(nextRunWib.getTime() - wibOffset)

    const rows = await sql`
      INSERT INTO auto_schedules (theme, days_of_week, time_of_day, auto_publish, next_run_at, is_active)
      VALUES (${body.theme}, ${body.days_of_week}, ${body.time_of_day}, ${body.auto_publish}, ${nextRun.toISOString()}, true)
      RETURNING *
    `
    
    return NextResponse.json({ schedule: rows[0], success: true })
  } catch (error) {
    console.error('Error creating schedule:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payload', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
  }
}
