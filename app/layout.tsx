import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Fredoka, Manrope } from 'next/font/google'
import './globals.css'

const fredoka = Fredoka({ variable: '--font-fredoka', subsets: ['latin'] })
const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pikachu Classic — Link & Match',
  description: 'Classic Pikachu tile-matching game with Gen 1 Pokemon sprites. Match pairs by connecting them with paths that have at most 2 turns.',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#171b33',
  userScalable: false,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="bg-background"><body className={`${fredoka.variable} ${manrope.variable} antialiased`}>{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
