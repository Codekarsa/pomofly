import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from './contexts/AuthContext'
import GoogleAnalytics from '../components/GoogleAnalytics'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Pomofly',
  description: 'A Minimal Pomodoro timer with task and project management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
        <GoogleAnalytics GA_MEASUREMENT_ID={process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!} />
      </body>
    </html>
  )
}