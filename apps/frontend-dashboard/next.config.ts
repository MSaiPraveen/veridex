import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Veridex Frontend Configuration
   * 
   * Architecture:
   * - Consumer/Merchant: Public-facing portals
   * - Admin: Internal portal (separate access)
   */
  
  // Environment variables validation
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002',
    NEXT_PUBLIC_ADMIN_API_URL: process.env.NEXT_PUBLIC_ADMIN_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002',
  },

  // Strict mode for better development experience
  reactStrictMode: true,

  // Output configuration for Docker deployment
  output: 'standalone',

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.veridex.com',
      },
    ],
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      // Admin routes get extra security headers
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },

  // Redirects for cleaner URLs
  async redirects() {
    return [
      // Redirect /login to role-specific login
      {
        source: '/login',
        destination: '/auth/merchant/login',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
