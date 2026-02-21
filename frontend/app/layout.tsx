import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/lib/redux/provider'
import NotificationManager from '@/components/NotificationManager'
import AuthInitializer from '@/components/AuthInitializer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ExamBuddy - Educational Platform',
  description: 'O/L and A/L exam preparation platform with MCQ papers and rankings',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <AuthInitializer />
          {children}
          <NotificationManager />
        </Providers>
      </body>
    </html>
  )
}
