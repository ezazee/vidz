import type { Metadata, Viewport } from 'next'
import { Geist, JetBrains_Mono } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

// Font dimuat sekali di root — landing dan seluruh halaman aplikasi memakai
// pasangan yang sama (lihat design.md § Typography).
const geist = Geist({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

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
    <html lang="id" className={`${geist.variable} ${mono.variable}`}>
      <body className={geist.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
