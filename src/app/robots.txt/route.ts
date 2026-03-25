import { MetadataRoute } from 'next'

export function GET(): Response {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pomofly.vercel.app'
  
  const robots = `User-agent: *
Allow: /

User-agent: *
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /auth/

Sitemap: ${baseUrl}/sitemap.xml
`

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}