import { NextRequest, NextResponse } from 'next/server';
import { checkPassword, createSessionToken, isAuthEnabled, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ ok: true });
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!checkPassword(password)) {
    return NextResponse.json({ ok: false, error: 'Incorrect password.' }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
  return response;
}
