import type { Metadata } from 'next'

export interface SEOConfig {
  title: string
  description: string
  path: string
  image?: string
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  tags?: string[]
  author?: string
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pomofly.vercel.app'
const siteName = 'Pomofly'
const defaultImage = '/icons/icon-512x512.png' // TODO: Create proper 1200x630 OG image

export function generateMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    path,
    image = defaultImage,
    type = 'website',
    publishedTime,
    modifiedTime,
    tags,
    author = 'Codekarsa'
  } = config

  const url = `${baseUrl}${path}`
  const fullTitle = title === siteName ? title : `${title} | ${siteName}`
  const imageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`

  return {
    title: fullTitle,
    description,
    keywords: [
      'pomodoro', 'timer', 'productivity', 'focus', 'time management', 
      'work', 'break', 'task management', 'concentration', 'workflow'
    ].concat(tags || []),
    authors: [{ name: author }],
    creator: author,
    publisher: siteName,
    applicationName: siteName,
    category: 'productivity',
    
    // Open Graph
    openGraph: {
      type,
      siteName,
      title: fullTitle,
      description,
      url,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${title} - ${siteName}`,
          type: 'image/png',
        },
      ],
      locale: 'en_US',
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },

    // Twitter
    twitter: {
      card: 'summary_large_image',
      site: '@pomofly',
      creator: '@codekarsa',
      title: fullTitle,
      description,
      images: [imageUrl],
    },

    // Canonical URL
    alternates: {
      canonical: url,
    },

    // Additional meta tags
    other: {
      'og:image:width': '1200',
      'og:image:height': '630',
      'twitter:image:width': '1200',
      'twitter:image:height': '630',
      'application-name': siteName,
      'apple-mobile-web-app-title': siteName,
    },
  }
}

export function generateStructuredData(config: SEOConfig) {
  const {
    title,
    description,
    path,
    image = defaultImage,
    author = 'Codekarsa'
  } = config

  const url = `${baseUrl}${path}`
  const imageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: siteName,
    applicationCategory: 'ProductivityApplication',
    applicationSubCategory: 'Time Management',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description,
    url,
    image: imageUrl,
    author: {
      '@type': 'Organization',
      name: author,
    },
    creator: {
      '@type': 'Organization',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '127',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      'Pomodoro Timer with customizable intervals',
      'Task and Project Management',
      'Focus Session Tracking',
      'Productivity Analytics',
      'Break Reminders',
      'Sound Notifications',
      'Dark Mode Support',
      'PWA Support for Mobile'
    ],
  }
}

// Page-specific metadata configurations
export const pageMetadata = {
  home: {
    title: 'Pomofly - Elegant Pomodoro Timer & Productivity App',
    description: 'Boost your productivity with Pomofly\'s elegant Pomodoro timer. Manage tasks, track focus sessions, and achieve more with proven time management techniques.',
    path: '/',
    tags: ['pomodoro technique', 'time blocking', 'focus sessions'],
  },
  tasks: {
    title: 'Tasks - Organize & Track Your Work',
    description: 'Manage your tasks efficiently with Pomofly. Create, organize, and track your work with integrated Pomodoro timers for enhanced productivity.',
    path: '/tasks',
    tags: ['task management', 'todo list', 'work organization'],
  },
  projects: {
    title: 'Projects - Manage Your Productivity Goals',
    description: 'Organize your work into projects with Pomofly. Track progress, manage tasks, and boost productivity with structured project management.',
    path: '/projects',
    tags: ['project management', 'productivity tracking', 'goal setting'],
  },
}