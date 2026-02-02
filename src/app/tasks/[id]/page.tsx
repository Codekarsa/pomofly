import TaskDetailClient from './TaskDetailClient';

// Required for static export with dynamic routes
// Returns empty array since task IDs come from Firebase at runtime
export function generateStaticParams() {
  return [];
}

export default function TaskDetailPage() {
  return <TaskDetailClient />;
}
