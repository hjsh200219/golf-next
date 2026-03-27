import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // If code arrives at root, redirect to auth callback
  if (pathname === '/' && searchParams.has('code') && !searchParams.has('error')) {
    const code = searchParams.get('code')!;
    const url = request.nextUrl.clone();
    url.pathname = '/api/auth/callback';
    url.searchParams.set('code', code);
    url.searchParams.delete('error');
    return NextResponse.redirect(url);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot)$).*)',
  ],
};
