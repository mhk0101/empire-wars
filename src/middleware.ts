import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // این middleware می‌تواند برای بررسی بن یا سایر موارد امنیتی استفاده شود
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/game/:path*',
    '/admin/:path*',
  ],
};
