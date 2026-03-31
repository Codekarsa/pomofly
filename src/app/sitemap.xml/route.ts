import { NextRequest, NextResponse } from 'next/server'

// Site configuration
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pomofly.vercel.app'

// Static pages with their priorities and change frequencies
const staticPages = [
  {
    url: '',
    priority: 1.0,
    changeFreq: 'weekly',
    lastMod: new Date().toISOString().split('T')[0], // Today's date
  },
  {
    url: '/tasks',
    priority: 0.8,
    changeFreq: 'daily',
    lastMod: new Date().toISOString().split('T')[0],
  },
  {
    url: '/projects', 
    priority: 0.8,
    changeFreq: 'daily',
    lastMod: new Date().toISOString().split('T')[0],
  },
]

// Future dynamic pages (projects, tasks) - placeholder for when we have public content
const generateDynamicPages = async () => {
  // In the future, we can fetch public projects or tasks here
  // For now, return empty array since all content is user-specific
  return []
}

export async function GET(request: NextRequest) {
  try {
    // Generate dynamic pages (future enhancement)
    const dynamicPages = await generateDynamicPages()
    
    // Combine static and dynamic pages
    const allPages = [...staticPages, ...dynamicPages]
    
    // Generate XML sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allPages
  .map(
    (page) => `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${page.lastMod}</lastmod>
    <changefreq>${page.changeFreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

    return new NextResponse(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate', // 24 hours cache
      },
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}

// Add revalidation for ISR
export const revalidate = 86400 // Revalidate once per day