import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Admin Portal Middleware
 * 
 * This middleware:
 * 1. Validates that requests are coming to the admin host (production)
 * 2. Checks for valid admin tokens
 * 3. Redirects unauthenticated users to login
 * 
 * In development, runs on localhost:4000
 * In production, runs on admin.veridex.app
 */

const PUBLIC_PATHS = ['/login', '/forgot-password', '/_next', '/favicon.ico'];
const ADMIN_TOKEN_COOKIE = 'admin_access_token';

// Admin hosts - add production domain when ready
const ALLOWED_ADMIN_HOSTS = [
  'localhost:4000',
  '127.0.0.1:4000',
  'admin.veridex.app',
  'admin.veridex.io',
];

export function middleware(request: NextRequest) {
  const { pathname, host } = request.nextUrl;

  // In production, verify this is actually the admin host
  // This prevents accessing admin portal from the main domain
  const isAllowedHost = ALLOWED_ADMIN_HOSTS.some(h => host.includes(h.split(':')[0]));
  
  if (!isAllowedHost && process.env.NODE_ENV === 'production') {
    // Block access if not on admin host
    return new NextResponse('Not Found', { status: 404 });
  }

  // Allow public paths
  const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check for admin token
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;

  if (!token) {
    // No token - redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Token exists - allow request
  // Note: Full token validation happens in auth context
  // Middleware just does quick presence check for performance
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
