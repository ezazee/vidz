import { NextRequest, NextResponse } from 'next/server'
import { authToken, AUTH_COOKIE } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Landing ("/"), login page & login API selalu boleh (pintu depan sebelum auth)
  if (pathname === '/' || pathname === '/login' || pathname === '/api/auth/login') {
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

  // Belum login & bukan lewat API → arahkan ke landing ("/"), bukan langsung
  // ke form password.
  const landingUrl = request.nextUrl.clone()
  landingUrl.pathname = '/'
  landingUrl.search = ''
  return NextResponse.redirect(landingUrl)
}

export const config = {
  // Semua route kecuali asset statis Next.js & file public. Exclude berbasis
  // ekstensi (png/svg/ico/webmanifest dst) supaya logo/favicon di public/ root
  // — termasuk yang dipakai DI HALAMAN LOGIN sendiri — tidak ikut ke-redirect.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|images/|voices/|audio/|favicon_io/|.*\\.(?:png|jpg|jpeg|svg|ico|webmanifest)$).*)',
  ],
}
