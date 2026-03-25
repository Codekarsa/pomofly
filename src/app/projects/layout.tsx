import { generateMetadata as genMetadata, pageMetadata } from '@/lib/metadata'

export const metadata = genMetadata(pageMetadata.projects)

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}