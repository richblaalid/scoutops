import type { Metadata } from 'next'
import { Nunito, Source_Serif_4 } from 'next/font/google'
import { PostHogProvider } from '@/components/providers/posthog-provider'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ChuckBox',
  description: 'Unit management platform for Scouting America troops',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} ${sourceSerif.variable} font-sans`}>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
