import { Metadata } from 'next'
import { generateMetadata, pageMetadata } from '@/lib/metadata'
import TasksClient from './TasksClient'

// Generate metadata for the tasks page
export const metadata: Metadata = generateMetadata(pageMetadata.tasks)

export default function TasksPage() {
  return <TasksClient />
}