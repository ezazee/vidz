import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Native module — jangan di-bundle webpack, load runtime langsung
  serverExternalPackages: ['@napi-rs/canvas'],
  // Font bundelan untuk render teks thumbnail — wajib ikut ke bundle serverless Vercel
  outputFileTracingIncludes: {
    '/api/projects/[id]/thumbnail/generate': ['./assets/fonts/**'],
    '/api/render-jobs/[id]': ['./assets/fonts/**'],
  },
}

export default nextConfig
