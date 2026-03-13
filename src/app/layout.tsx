import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import { Suspense } from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pomofly - Elegant Pomodoro Timer',
  description: 'An elegant and minimal Pomodoro timer for productive focus',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <Suspense fallback={<div>Loading...</div>}>
              <GoogleAnalytics GA_MEASUREMENT_ID={process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!} />
            </Suspense>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}