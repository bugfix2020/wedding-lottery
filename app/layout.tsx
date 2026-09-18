import React from 'react'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { PRIZE_TIERS } from '@/lib/prizes'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '郑雨 & 胡紫萱 · 婚礼抽奖',
  description: '婚礼礼品抽奖系统',
  generator: 'v0.app',
  icons: {
    icon: '/wedding-lottery/favicon.svg',
    apple: '/wedding-lottery/favicon.svg'
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const giftImages = Array.from(
    new Set(PRIZE_TIERS.flatMap(t => t.gifts.map(g => g.image)))
  )

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {giftImages.map(href => (
          <link key={href} rel="preload" as="image" href={href} />
        ))}
        <link rel="preload" as="audio" href="/wedding-lottery/audio/rolling.mp3" />
        <link rel="preload" as="audio" href="/wedding-lottery/audio/win.mp3" />
      </head>
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
