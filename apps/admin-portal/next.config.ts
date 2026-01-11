import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Veridex Admin Portal Configuration
   * 
   * This is a COMPLETELY SEPARATE app from the main frontend.
   * Runs on port 4000 in development.
   * Deployed to admin.veridex.app in production.
   */
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_NAME: 'Veridex Admin',
    NEXT_PUBLIC_API_URL: process.env.ADMIN_API_BASE_URL || 'http://localhost:3002',
    NEXT_PUBLIC_IS_ADMIN_PORTAL: 'true',
  },

  // Strict mode
  reactStrictMode: true,

  // Standalone output for Docker
  output: 'standalone',

  // Security headers - extra strict for admin
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // No caching for admin pages
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },
};

export default nextConfig;
