import { Metadata } from 'next'
import { generateMetadata, pageMetadata } from '@/lib/metadata'
import ProjectsClient from './ProjectsClient'

// Generate metadata for the projects page
export const metadata: Metadata = generateMetadata(pageMetadata.projects)

export default function ProjectsPage() {
  return <ProjectsClient />
}