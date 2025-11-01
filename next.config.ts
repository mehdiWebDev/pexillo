// next.config.ts
import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig = {
  // Add images configuration for Supabase
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nrjpzicfgkvncatismki.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Add any other existing configurations here
} satisfies NextConfig

export default withNextIntl(nextConfig)