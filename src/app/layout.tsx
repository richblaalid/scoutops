import type { Metadata } from 'next'
import { Bricolage_Grotesque, DM_Sans, Source_Serif_4 } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { PostHogProvider } from '@/components/providers/posthog-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import './globals.css'

// Primary display font - quirky geometric with unexpected details
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
})

// Body font - warm and highly readable
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
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
      <body className={`${bricolage.variable} ${dmSans.variable} ${sourceSerif.variable} font-sans antialiased`}>
        <ThemeProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
