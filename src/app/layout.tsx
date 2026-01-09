import type { Metadata } from 'next'
import { Outfit, Source_Serif_4 } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Chuckbox',
  description: 'Unit management platform for Scouting America troops',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${sourceSerif.variable} font-sans`}>{children}</body>
    </html>
  )
}
