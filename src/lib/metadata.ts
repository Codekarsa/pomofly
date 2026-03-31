import { Metadata } from 'next'

// Base URLs and constants
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pomofly.vercel.app'
const siteName = 'Pomofly'
const defaultTitle = 'Pomofly - Elegant Pomodoro Timer'
const defaultDescription = 'An elegant and minimal Pomodoro timer for productive focus. Boost your productivity with scientifically proven time management techniques.'
const defaultImage = `${siteUrl}/og-image.png`
const twitterHandle = '@pomofly' // Update with actual handle when available

export interface MetadataConfig {
  title?: string
  description?: string
  path?: string
  image?: string
  noIndex?: boolean
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  tags?: string[]
}

export function generateMetadata(config: MetadataConfig = {}): Metadata {
  const {
    title = defaultTitle,
    description = defaultDescription,
    path = '',
    image = defaultImage,
    noIndex = false,
    type = 'website',
    publishedTime,
    modifiedTime,
    tags = []
  } = config

  const url = `${siteUrl}${path}`
  const fullTitle = title === defaultTitle ? title : `${title} | ${siteName}`

  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords: [
      'pomodoro timer',
      'productivity',
      'focus timer',
      'time management',
      'work timer',
      'break timer',
      'concentration',
      'task management',
      'productivity app',
      'focus app',
      ...tags
    ],
    authors: [{ name: 'Codekarsa' }],
    creator: 'Codekarsa',
    publisher: siteName,
    applicationName: siteName,
    category: 'productivity',
    robots: noIndex ? 'noindex,nofollow' : 'index,follow',
    
    // OpenGraph
    openGraph: {
      type,
      siteName,
      title: fullTitle,
      description,
      url,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${siteName} - ${title}`,
        }
      ],
      locale: 'en_US',
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },

    // Twitter
    twitter: {
      card: 'summary_large_image',
      site: twitterHandle,
      creator: twitterHandle,
      title: fullTitle,
      description,
      images: [image],
    },

    // Additional social media and SEO
    other: {
      // Facebook App ID (update when available)
      'fb:app_id': process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
      
      // Apple specific
      'apple-mobile-web-app-title': siteName,
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      
      // Microsoft
      'msapplication-TileColor': '#3b82f6',
      'msapplication-config': '/browserconfig.xml',
      
      // Theme colors
      'theme-color': '#3b82f6',
      
      // Prevent automatic detection
      'format-detection': 'telephone=no',
    },

    // Canonical URL
    alternates: {
      canonical: url,
    },
  }

  return metadata
}

// Structured data generator for JSON-LD
export function generateStructuredData(config: MetadataConfig = {}) {
  const {
    title = defaultTitle,
    description = defaultDescription,
    path = '',
    image = defaultImage,
  } = config

  const url = `${siteUrl}${path}`

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: siteName,
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web Browser',
    description,
    url: siteUrl,
    image,
    author: {
      '@type': 'Organization',
      name: 'Codekarsa',
      url: siteUrl,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      category: 'free',
    },
    featureList: [
      'Pomodoro Timer',
      'Task Management',
      'Progress Tracking',
      'Focus Sessions',
      'Break Reminders',
      'Productivity Analytics'
    ],
    screenshot: image,
    softwareVersion: '1.0',
    dateCreated: '2024-01-01',
    inLanguage: 'en-US',
    isAccessibleForFree: true,
    browserRequirements: 'Modern web browser with JavaScript enabled'
  }
}

// Dynamic metadata for different page types
export const pageMetadata = {
  home: {
    title: defaultTitle,
    description: defaultDescription,
    path: '',
  },
  tasks: {
    title: 'Tasks - Pomofly',
    description: 'Manage your tasks and boost productivity with Pomofly\'s elegant task management system.',
    path: '/tasks',
  },
  projects: {
    title: 'Projects - Pomofly',
    description: 'Organize your work into projects and track progress with Pomofly\'s project management features.',
    path: '/projects',
  },
}