/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/wedding-lottery',
  assetPrefix: '/wedding-lottery/',
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
