import { Suspense, lazy } from 'react';
import { TaskDetailLoader } from '@/components/ui/loading';

const TaskDetailClient = lazy(() => import('./TaskDetailClient'));

// Generate a placeholder page for static export
// Cloudflare _redirects will rewrite all /tasks/* to this page
export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function TaskDetailPage() {
  return (
    <Suspense fallback={<TaskDetailLoader />}>
      <TaskDetailClient />
    </Suspense>
  );
}
