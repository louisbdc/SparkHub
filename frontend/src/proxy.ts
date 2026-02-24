import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/register', '/invite/accept', '/forgot-password', '/reset-password']
const TOKEN_KEY = 'sparkhub_token'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes do their own Bearer token validation
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  const token = request.cookies.get(TOKEN_KEY)?.value
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))

  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
