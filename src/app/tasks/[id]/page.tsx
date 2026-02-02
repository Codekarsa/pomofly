import TaskDetailClient from './TaskDetailClient';

// Required for static export with dynamic routes
export const dynamicParams = false;

export function generateStaticParams() {
  // Return empty array - all pages rendered client-side
  return [];
}

export default function TaskDetailPage() {
  return <TaskDetailClient />;
}
