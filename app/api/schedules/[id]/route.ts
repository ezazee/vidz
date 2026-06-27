import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db/client'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

const updateScheduleSchema = z.object({
  is_active: z.boolean().optional(),
})

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params
  const sql = getSql()
  try {
    const body = updateScheduleSchema.parse(await request.json())
    
    let rows
    if (body.is_active !== undefined) {
      rows = await sql`
        UPDATE auto_schedules 
        SET is_active = ${body.is_active}
        WHERE id = ${id}
        RETURNING *
      `
    }
    
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }
    
    return NextResponse.json({ schedule: rows[0], success: true })
  } catch (error) {
    console.error('Error updating schedule:', error)
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params
  const sql = getSql()
  try {
    await sql`DELETE FROM auto_schedules WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting schedule:', error)
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 })
  }
}
