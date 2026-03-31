import React from 'react'

// Site configuration
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pomofly.vercel.app'
const SITE_NAME = 'Pomofly'

export interface StructuredDataProps {
  type: 'Website' | 'SoftwareApplication' | 'WebApplication' | 'Article' | 'HowTo' | 'FAQ'
  data?: Record<string, unknown>
}

// Base schema for the website
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'Website',
  name: SITE_NAME,
  url: SITE_URL,
  description: 'An elegant and minimal Pomodoro timer for productive focus sessions and task management.',
  author: {
    '@type': 'Organization',
    name: 'Codekarsa',
    url: SITE_URL,
  },
  sameAs: [
    // Add social media profiles when available
    // 'https://twitter.com/pomofly',
    // 'https://github.com/codekarsa/pomofly',
  ],
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

// Schema for the software application
const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'ProductivityApplication',
  applicationSubCategory: 'Time Management',
  operatingSystem: 'Web Browser, iOS, Android',
  url: SITE_URL,
  description: 'A web-based Pomodoro timer that helps you manage time, track tasks, and boost productivity using the proven Pomodoro Technique.',
  author: {
    '@type': 'Organization',
    name: 'Codekarsa',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  featureList: [
    'Pomodoro Timer',
    'Task Management', 
    'Project Organization',
    'Progress Tracking',
    'Focus Sessions',
    'Break Reminders',
    'Productivity Analytics',
    'Mobile Responsive',
    'Offline Support',
    'No Account Required',
  ],
  screenshot: `${SITE_URL}/icons/screenshot.png`,
  softwareVersion: '1.0.0',
  datePublished: '2024-01-01',
  dateModified: new Date().toISOString().split('T')[0],
  browserRequirements: 'Chrome 80+, Firefox 75+, Safari 13+, Edge 80+',
  memoryRequirements: '128MB',
  storageRequirements: '10MB',
  processorRequirements: 'Any modern processor',
  supportingData: {
    '@type': 'DataFeed',
    description: 'Productivity analytics and session history',
  },
  accessibilityFeature: [
    'ARIA labels',
    'Keyboard navigation',
    'Screen reader support',
    'High contrast mode',
  ],
  accessibilityHazard: 'none',
  accessibilityAPI: 'ARIA',
  accessibilityControl: 'fullKeyboardControl',
}

// Schema for articles/blog posts  
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  publisher: {
    '@type': 'Organization',
    name: 'Codekarsa',
    url: SITE_URL,
  },
  author: {
    '@type': 'Organization',
    name: 'Codekarsa',
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': SITE_URL,
  },
}

// Schema for How-To guides
const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Use the Pomodoro Technique for Better Productivity',
  description: 'Learn how to implement the Pomodoro Technique using our timer for improved focus and productivity.',
  image: `${SITE_URL}/icons/pomodoro-guide.png`,
  totalTime: 'PT25M', // 25 minutes
  supply: [
    {
      '@type': 'HowToSupply',
      name: 'Pomofly Timer',
      image: `${SITE_URL}/icons/icon-192x192.png`,
    },
    {
      '@type': 'HowToSupply', 
      name: 'Task List',
    },
  ],
  tool: [
    {
      '@type': 'HowToTool',
      name: 'Web Browser',
    },
  ],
  step: [
    {
      '@type': 'HowToStep',
      name: 'Set Your Task',
      text: 'Choose a task you want to focus on and add it to your task list.',
      image: `${SITE_URL}/icons/step1.png`,
    },
    {
      '@type': 'HowToStep', 
      name: 'Start Timer',
      text: 'Start the 25-minute Pomodoro timer and focus solely on your chosen task.',
      image: `${SITE_URL}/icons/step2.png`,
    },
    {
      '@type': 'HowToStep',
      name: 'Take Break',
      text: 'When the timer rings, take a 5-minute break to rest and recharge.',
      image: `${SITE_URL}/icons/step3.png`,
    },
    {
      '@type': 'HowToStep',
      name: 'Repeat',
      text: 'Repeat the process. After 4 pomodoros, take a longer 15-30 minute break.',
      image: `${SITE_URL}/icons/step4.png`,
    },
  ],
}

// Schema for FAQ pages
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the Pomodoro Technique?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Pomodoro Technique is a time management method that uses a timer to break work into 25-minute focused intervals, separated by short breaks.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I use Pomofly?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Simply add your tasks, start the timer, and focus on one task at a time. The timer will automatically switch between work sessions and breaks.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Pomofly free to use?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, Pomofly is completely free to use. You can access all features without creating an account or paying any fees.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does Pomofly work offline?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, Pomofly works offline as a Progressive Web App (PWA). You can use the timer and manage tasks without an internet connection.',
      },
    },
  ],
}

// Schema generators
const schemaGenerators = {
  Website: () => websiteSchema,
  SoftwareApplication: () => softwareApplicationSchema,
  WebApplication: () => ({ ...softwareApplicationSchema, '@type': 'WebApplication' }),
  Article: (data: Record<string, unknown>) => ({ ...articleSchema, ...data }),
  HowTo: (data: Record<string, unknown>) => ({ ...howToSchema, ...data }),
  FAQ: (data: Record<string, unknown>) => ({ ...faqSchema, mainEntity: (data?.questions as unknown[]) || faqSchema.mainEntity }),
}

export default function StructuredData({ type, data = {} }: StructuredDataProps) {
  const schema = schemaGenerators[type]?.(data)
  
  if (!schema) {
    console.warn(`Unknown structured data type: ${type}`)
    return null
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema, null, 2),
      }}
    />
  )
}

// Convenience components for specific schemas
export const WebsiteStructuredData = () => <StructuredData type="Website" />
export const SoftwareApplicationStructuredData = () => <StructuredData type="SoftwareApplication" />
export const HowToStructuredData = (props: { data?: Record<string, unknown> }) => <StructuredData type="HowTo" data={props.data} />
export const FAQStructuredData = (props: { questions?: unknown[] }) => (
  <StructuredData type="FAQ" data={{ questions: props.questions }} />
)