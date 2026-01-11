/**
 * Veridex Next.js Middleware - Main Frontend
 * 
 * This is the CONSUMER + MERCHANT portal ONLY.
 * Admin portal runs on a completely separate app (admin.veridex.io / localhost:4000).
 * 
 * SECURITY: Admin routes return 404 (not 403) to hide their existence.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes - no auth required
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/auth/merchant/login',
  '/auth/merchant/register',
  '/auth/consumer/login',
  '/auth/consumer/register',
  '/unauthorized',
  '/404',
];

// BLOCKED: Admin routes return 404 to hide existence
// Admin portal is on separate app (localhost:4000 / admin.veridex.io)
const BLOCKED_ROUTES = ['/admin'];

// Protected routes by role
const MERCHANT_ROUTES = ['/merchant'];
const CONSUMER_ROUTES = ['/consumer'];

// Check if path matches any of the route prefixes
function matchesRoutes(path: string, routes: string[]): boolean {
  return routes.some(route => path === route || path.startsWith(`${route}/`));
}

// Decode JWT payload without verification (verification happens server-side)
function decodeToken(token: string): { role?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

// Check if token is expired
function isTokenExpired(payload: { exp?: number }): boolean {
  if (!payload.exp) return true;
  // Add 30 second buffer
  return Date.now() >= (payload.exp * 1000) - 30000;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // Static files
  ) {
    return NextResponse.next();
  }

  // ============================================
  // SECURITY: Block ALL admin routes with 404
  // Admin portal is on separate app - these routes don't exist here
  // Return 404 (not 403) to hide admin existence
  // ============================================
  if (matchesRoutes(pathname, BLOCKED_ROUTES)) {
    return new NextResponse('Not Found', { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Check cookie-based auth
  const accessToken = request.cookies.get('veridex_access_token')?.value;
  
  // If no token, redirect to appropriate login
  if (!accessToken) {
    let loginUrl = '/login';
    
    if (matchesRoutes(pathname, MERCHANT_ROUTES)) {
      loginUrl = '/auth/merchant/login';
    } else if (matchesRoutes(pathname, CONSUMER_ROUTES)) {
      loginUrl = '/auth/consumer/login';
    }
    
    const url = request.nextUrl.clone();
    url.pathname = loginUrl;
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Decode and validate token
  const payload = decodeToken(accessToken);
  
  if (!payload || isTokenExpired(payload)) {
    // Token invalid or expired - clear and redirect
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('veridex_access_token');
    response.cookies.delete('veridex_refresh_token');
    return response;
  }

  const userRole = payload.role?.toUpperCase();

  // Role-based route protection
  if (matchesRoutes(pathname, MERCHANT_ROUTES)) {
    // Merchant routes require MERCHANT role
    if (userRole !== 'MERCHANT') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  if (matchesRoutes(pathname, CONSUMER_ROUTES)) {
    // Consumer routes require CONSUMER role
    if (userRole !== 'CONSUMER') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
