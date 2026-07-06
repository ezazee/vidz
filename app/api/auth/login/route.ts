import { NextResponse } from 'next/server'
import { authToken, AUTH_COOKIE } from '@/lib/auth'

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({}))

  if (!process.env.APP_PASSWORD) {
    return NextResponse.json({ error: 'APP_PASSWORD belum dikonfigurasi di server' }, { status: 500 })
  }

  if (!password || password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: 'Password salah' }, { status: 401 })
  }

  const token = await authToken()
  const res = NextResponse.json({ success: true })
  res.cookies.set(AUTH_COOKIE, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 hari
    path: '/',
  })
  return res
}
