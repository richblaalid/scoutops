import type { Metadata } from 'next'
import { Nunito, Source_Serif_4 } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { PostHogProvider } from '@/components/providers/posthog-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import './globals.css'

// Primary font - friendly and highly readable (brand standard)
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
})

// Editorial/serif font for special moments
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${nunito.variable} ${sourceSerif.variable} font-sans antialiased`}>
        <ThemeProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
