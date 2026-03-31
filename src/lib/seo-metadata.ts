import { Metadata } from 'next'

// Site configuration
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pomofly.vercel.app'
const SITE_NAME = 'Pomofly'
const SITE_TITLE = 'Pomofly - Elegant Pomodoro Timer'
const SITE_DESCRIPTION = 'An elegant and minimal Pomodoro timer for productive focus sessions. Track tasks, manage projects, and boost productivity with the proven Pomodoro Technique.'

// Social media configuration
const SOCIAL_IMAGE = '/icons/icon-512x512.png' // Using the existing app icon
const TWITTER_HANDLE = process.env.NEXT_PUBLIC_TWITTER_HANDLE || '@pomofly'

export interface SEOConfig {
  title?: string
  description?: string
  keywords?: string[]
  image?: string
  url?: string
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  authors?: string[]
  section?: string
}

export function generateMetadata(config: SEOConfig = {}): Metadata {
  const {
    title = SITE_TITLE,
    description = SITE_DESCRIPTION,
    keywords = ['pomodoro', 'timer', 'productivity', 'focus', 'time management'],
    image = SOCIAL_IMAGE,
    url = SITE_URL,
    type = 'website',
    publishedTime,
    modifiedTime,
    authors = ['Codekarsa'],
    section,
  } = config

  const fullTitle = title === SITE_TITLE ? title : `${title} - ${SITE_NAME}`
  const fullUrl = url.startsWith('http') ? url : `${SITE_URL}${url}`
  const fullImageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    authors: authors.map(author => ({ name: author })),
    creator: authors[0] || 'Codekarsa',
    publisher: SITE_NAME,
    applicationName: SITE_NAME,
    category: 'productivity',
    
    // Open Graph
    openGraph: {
      title: fullTitle,
      description,
      url: fullUrl,
      siteName: SITE_NAME,
      type: type as 'website' | 'article',
      images: [
        {
          url: fullImageUrl,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
      locale: 'en_US',
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(authors.length > 0 && { authors: authors }),
      ...(section && { section }),
    },

    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [fullImageUrl],
      creator: TWITTER_HANDLE,
      site: TWITTER_HANDLE,
    },

    // Additional meta tags
    other: {
      'og:image:alt': fullTitle,
      'og:image:type': 'image/png',
      'og:image:width': '1200',
      'og:image:height': '630',
      
      // Apple-specific
      'apple-mobile-web-app-title': SITE_NAME,
      'application-name': SITE_NAME,
      
      // Microsoft-specific
      'msapplication-TileColor': '#3b82f6',
      'msapplication-config': '/browserconfig.xml',
      
      // Theme colors
      'theme-color': '#3b82f6',
      'msapplication-navbutton-color': '#3b82f6',
      'apple-mobile-web-app-status-bar-style': 'default',
    },

    // Canonical URL
    alternates: {
      canonical: fullUrl,
    },

    // Robots
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },

    // Verification (add when available)
    verification: {
      // google: 'your-google-verification-code',
      // yandex: 'your-yandex-verification-code',
      // yahoo: 'your-yahoo-verification-code',
    },
  }
}

// Predefined metadata for common pages
export const homePageMetadata = generateMetadata({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: ['pomodoro timer', 'productivity app', 'focus timer', 'time management', 'work productivity', 'study timer'],
  url: '/',
})

export const tasksPageMetadata = generateMetadata({
  title: 'Tasks - Organize Your Work',
  description: 'Manage and organize your tasks with the Pomodoro Technique. Track progress, set priorities, and boost productivity.',
  keywords: ['task management', 'todo list', 'productivity', 'pomodoro tasks', 'work organization'],
  url: '/tasks',
})

export const projectsPageMetadata = generateMetadata({
  title: 'Projects - Manage Your Goals',
  description: 'Organize your work into projects and track progress with focused Pomodoro sessions. Achieve your goals efficiently.',
  keywords: ['project management', 'goal tracking', 'productivity projects', 'work organization', 'pomodoro projects'],
  url: '/projects',
})

// Utility function for dynamic page metadata
export function createPageMetadata(
  title: string,
  description: string,
  path: string,
  options: Partial<SEOConfig> = {}
): Metadata {
  return generateMetadata({
    title,
    description,
    url: path,
    ...options,
  })
}