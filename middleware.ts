import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const appPassword = process.env.APP_PASSWORD;
  const authEnabled = Boolean(appPassword && appPassword.length > 0);

  if (!authEnabled) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon');

  if (isPublicPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const valid = await verifySessionToken(token);

  if (!valid) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
