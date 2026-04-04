import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import ErrorBoundary from '@/components/ErrorBoundary'
import PWAServiceWorker from '@/components/PWAServiceWorker'
import { Suspense } from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pomofly - Elegant Pomodoro Timer',
  description: 'An elegant and minimal Pomodoro timer for productive focus',
  keywords: ['pomodoro', 'timer', 'productivity', 'focus', 'time management', 'work', 'break'],
  authors: [{ name: 'Codekarsa' }],
  creator: 'Codekarsa',
  publisher: 'Pomofly',
  applicationName: 'Pomofly',
  category: 'productivity',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pomofly',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
    ],
  },
  other: {
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/browserconfig.xml',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Pomofly',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100`}>
        <ErrorBoundary name="RootLayout" showDetails={process.env.NODE_ENV === 'development'}>
          <AuthProvider>
            <ToastProvider>
              <Suspense fallback={<div>Loading...</div>}>
                <GoogleAnalytics GA_MEASUREMENT_ID={process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!} />
              </Suspense>
              {children}
              <PWAServiceWorker />
            </ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}