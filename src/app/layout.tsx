import type { Metadata } from 'next'
import { Nunito, Source_Serif_4 } from 'next/font/google'
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
      <body className={`${nunito.variable} ${sourceSerif.variable} font-sans`}>{children}</body>
    </html>
  )
}
