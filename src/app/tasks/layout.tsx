import { generateMetadata as genMetadata, pageMetadata } from '@/lib/metadata'

export const metadata = genMetadata(pageMetadata.tasks)

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}