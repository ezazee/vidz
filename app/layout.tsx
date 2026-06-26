import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'StoryZ',
  description: 'AI production studio for documentary-style YouTube videos.',
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
