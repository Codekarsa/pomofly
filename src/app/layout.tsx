import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from './contexts/AuthContext'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import StructuredData from '@/components/StructuredData'
import { Suspense } from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Pomofly - Elegant Pomodoro Timer',
    template: '%s | Pomofly',
  },
  description: 'An elegant and minimal Pomodoro timer for productive focus sessions. Track your tasks, manage projects, and boost productivity with AI-powered task breakdown.',
  keywords: ['pomodoro', 'timer', 'productivity', 'focus', 'task management', 'time tracking'],
  authors: [{ name: 'Pomofly Team' }],
  creator: 'Pomofly Team',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://pomofly.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Pomofly - Elegant Pomodoro Timer',
    description: 'An elegant and minimal Pomodoro timer for productive focus sessions. Track your tasks, manage projects, and boost productivity with AI-powered task breakdown.',
    siteName: 'Pomofly',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Pomofly - Elegant Pomodoro Timer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pomofly - Elegant Pomodoro Timer',
    description: 'An elegant and minimal Pomodoro timer for productive focus sessions. Track your tasks, manage projects, and boost productivity.',
    images: ['/twitter-image.png'],
    creator: '@pomofly_app',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <StructuredData />
      </head>
      <body className={`${inter.className} bg-gray-100`}>
        <AuthProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <GoogleAnalytics GA_MEASUREMENT_ID={process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!} />
          </Suspense>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}