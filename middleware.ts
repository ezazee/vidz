import { NextRequest, NextResponse } from 'next/server'
import { authToken, AUTH_COOKIE } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Login page & login API selalu boleh
  if (pathname === '/login' || pathname === '/api/auth/login') {
    return NextResponse.next()
  }

  // Machine-to-machine: GitHub Actions (x-api-secret) & cron (Bearer CRON_SECRET)
  if (pathname.startsWith('/api')) {
    const apiSecret = request.headers.get('x-api-secret')
    if (apiSecret && process.env.API_SECRET && apiSecret === process.env.API_SECRET) {
      return NextResponse.next()
    }
    const auth = request.headers.get('authorization')
    if (auth && process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.next()
    }
  }

  // Browser: cek cookie
  const expected = await authToken()
  if (!expected) return NextResponse.next() // APP_PASSWORD belum di-set → auth off

  const cookie = request.cookies.get(AUTH_COOKIE)?.value
  if (cookie === expected) return NextResponse.next()

  if (pathname.startsWith('/api')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.search = ''
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Semua route kecuali asset statis Next.js & file public
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/|voices/|audio/).*)'],
}
