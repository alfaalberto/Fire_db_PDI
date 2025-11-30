import type {NextConfig} from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const isGithubPages = process.env.GITHUB_PAGES === 'true';
const repo = process.env.REPO_NAME || '';

const nextConfig: NextConfig = {

  output: isGithubPages ? 'export' : undefined,
  images: {
    unoptimized: !!isGithubPages,
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
    ],
  },
  ...(isGithubPages
    ? {
        basePath: repo ? `/${repo}` : undefined,
        assetPrefix: repo ? `/${repo}/` : undefined,
      }
    : {
        headers: async () => {
          const csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:",
            "style-src 'self' 'unsafe-inline' https: http: data:",
            "img-src 'self' data: blob: https: http:",
            "media-src 'self' data: blob: https: http:",
            "font-src 'self' data: https: http:",
            "connect-src 'self' https: http: ws: wss: data:",
            "worker-src 'self' blob: https: http: data:",
            "frame-src 'self' https: http: data: blob:",
            "frame-ancestors 'self'",
            "object-src 'none'",
            "base-uri 'self'",
          ].join('; ');
          return [
            {
              source: '/:path*',
              headers: [
                { key: 'Content-Security-Policy', value: csp },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
              ],
            },
            {
              source: '/katex/fonts/:path*',
              headers: [
                { key: 'Access-Control-Allow-Origin', value: '*' },
                { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
                { key: 'Access-Control-Allow-Headers', value: '*' },
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
              ],
            },
            { source: '/images/:path*', headers: [
                { key: 'Access-Control-Allow-Origin', value: '*' },
                { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
                { key: 'Access-Control-Allow-Headers', value: '*' },
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
            ]},
            { source: '/assets/:path*', headers: [
                { key: 'Access-Control-Allow-Origin', value: '*' },
                { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
                { key: 'Access-Control-Allow-Headers', value: '*' },
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
            ]},
            { source: '/media/:path*', headers: [
                { key: 'Access-Control-Allow-Origin', value: '*' },
                { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
                { key: 'Access-Control-Allow-Headers', value: '*' },
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
            ]},
            { source: '/models/:path*', headers: [
                { key: 'Access-Control-Allow-Origin', value: '*' },
                { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
                { key: 'Access-Control-Allow-Headers', value: '*' },
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
            ]},
            { source: '/textures/:path*', headers: [
                { key: 'Access-Control-Allow-Origin', value: '*' },
                { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
                { key: 'Access-Control-Allow-Headers', value: '*' },
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
            ]},
          ];
        },
      }),
};

export default (isGithubPages
  ? nextConfig
  : withSentryConfig(nextConfig, { silent: true }));
