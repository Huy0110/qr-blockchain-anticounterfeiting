import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standard SSR. NOT a static export — the management portal needs
  // runtime auth (NextAuth) and hub-proxied API routes.
  poweredByHeader: false,
  // `standalone` emits a self-contained server.js + .next/standalone
  // so the Docker runtime can copy just that into a slim image.
  output: 'standalone',
  experimental: {
    instrumentationHook: false,
  },
};

export default withNextIntl(nextConfig);
