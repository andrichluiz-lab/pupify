import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = new Set(['/login', '/register'])

async function verifyToken(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    await jwtVerify(token, secret)
    return true
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.has(pathname)
  const token = request.cookies.get('auth_token')?.value
  const isAuthenticated = token ? await verifyToken(token) : false

  // Autenticado tentando acessar login/register → manda pro dashboard
  if (isPublic && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Não autenticado tentando acessar rota protegida → manda pro login
  if (!isPublic && !isAuthenticated) {
    const url = new URL('/login', request.url)
    if (pathname !== '/') url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|webp|mp4|webm|ogg|mp3|wav|pdf)).*)',
  ],
}
