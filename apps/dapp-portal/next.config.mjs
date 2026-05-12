import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  // IPFS gateway compat: never use absolute paths that assume hostname
  // root. With trailingSlash + dynamic routes generated at build time,
  // the dApp renders correctly under /ipfs/<CID>/ as well as /.
};

export default withNextIntl(nextConfig);
