import { Suspense, lazy } from 'react';
import { TaskDetailLoader } from '@/components/ui/loading';

const TaskDetailClient = lazy(() => import('./TaskDetailClient'));

// Generate the static task-detail shell. Firebase Hosting (firebase.json) and
// Cloudflare (public/_redirects) rewrite /tasks/* here, preserving the real URL.
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
