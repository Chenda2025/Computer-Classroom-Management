import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  const isAuthPage = request.nextUrl.pathname === '/';
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

  if (isDashboard) {
    if (!token) return NextResponse.redirect(new URL('/', request.url));
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.redirect(new URL('/', request.url));
  }

  if (isAuthPage && token) {
    const payload = await verifyToken(token);
    if (payload) return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
