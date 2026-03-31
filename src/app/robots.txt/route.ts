import { NextResponse } from 'next/server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pomofly.vercel.app'

export async function GET() {
  const robots = `User-agent: *
Allow: /
Allow: /tasks
Allow: /projects

# Disallow user-specific and private content
Disallow: /api/
Disallow: /_next/
Disallow: /private/
Disallow: /admin/

# Performance and SEO files
Allow: /sitemap.xml
Allow: /favicon.ico
Allow: /icons/
Allow: /manifest.json

# Sitemap location
Sitemap: ${SITE_URL}/sitemap.xml

# Crawl delay to be respectful
Crawl-delay: 1

# Additional sitemaps for future expansion
# Sitemap: ${SITE_URL}/blog-sitemap.xml
# Sitemap: ${SITE_URL}/help-sitemap.xml`

  return new NextResponse(robots, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate', // 24 hours cache
    },
  })
}