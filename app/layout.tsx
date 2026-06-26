import type { Metadata } from 'next'
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
      <body>{children}</body>
    </html>
  )
}
