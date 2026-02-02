import TaskDetailClient from './TaskDetailClient';

// Generate a placeholder page for static export
// Cloudflare _redirects will rewrite all /tasks/* to this page
export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function TaskDetailPage() {
  return <TaskDetailClient />;
}
