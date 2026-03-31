import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from './contexts/AuthContext'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import ErrorBoundary from '@/components/ErrorBoundary'
import PWAServiceWorker from '@/components/PWAServiceWorker'
import StructuredData, { WebsiteStructuredData, SoftwareApplicationStructuredData } from '@/components/StructuredData'
import { homePageMetadata } from '@/lib/seo-metadata'
import { Suspense } from 'react'

const inter = Inter({ subsets: ['latin'] })

// Use the enhanced SEO metadata
export const metadata: Metadata = {
  ...homePageMetadata,
  // Keep PWA-specific metadata
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
      <head>
        {/* Structured Data */}
        <WebsiteStructuredData />
        <SoftwareApplicationStructuredData />
      </head>
      <body className={`${inter.className} bg-gray-100`}>
        <ErrorBoundary name="RootLayout" showDetails={process.env.NODE_ENV === 'development'}>
          <AuthProvider>
            <Suspense fallback={<div>Loading...</div>}>
              <GoogleAnalytics GA_MEASUREMENT_ID={process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!} />
            </Suspense>
            {children}
            <PWAServiceWorker />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}