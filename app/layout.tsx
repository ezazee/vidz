import type { Metadata, Viewport } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'StoryZ',
  description: 'AI production studio for documentary-style YouTube videos.',
  robots: {
    index: false,
    follow: false,
  },
  manifest: '/favicon_io/site.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#12102A',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body><Providers>{children}</Providers></body>
    </html>
  )
}
