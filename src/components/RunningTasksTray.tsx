'use client';

import React, { useCallback, useId, useRef, useState } from 'react';
import { Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTasks, type Task } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useTimeTracking } from '@/hooks/useTimeTracking';

export default function RunningTasksTray() {
  // Deliberately unfiltered: running work must remain reachable on every route.
  const { tasks, stopTimeTracking, error } = useTasks();
  const { projects } = useProjects();
  const { activelyTrackedTasks, getElapsedTime, formatTime } = useTimeTracking(tasks);
  const headingId = useId();
  const [expanded, setExpanded] = useState(false);
  const pendingIds = useRef(new Set<string>());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const stopTask = useCallback(async (task: Task) => {
    if (pendingIds.current.has(task.id)) return;
    pendingIds.current.add(task.id);
    setPending(new Set(pendingIds.current));
    setErrors(current => ({ ...current, [task.id]: '' }));
    try {
      // The hook adds session seconds to the already-saved manual total.
      const sessionSeconds = Math.max(0, getElapsedTime(task) - (task.manualTimeSpent ?? 0));
      await stopTimeTracking(task.id, sessionSeconds);
    } catch {
      setErrors(current => ({ ...current, [task.id]: 'Could not stop tracking. Please try again.' }));
    } finally {
      pendingIds.current.delete(task.id);
      setPending(new Set(pendingIds.current));
    }
  }, [getElapsedTime, stopTimeTracking]);

  if (activelyTrackedTasks.length === 0) return null;

  return (
    <section
      aria-labelledby={headingId}
      tabIndex={0}
      className="max-h-[35vh] min-h-0 w-full shrink-0 overflow-y-auto border-b bg-background px-3 py-2 sm:px-4"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
      <h2 id={headingId} className="text-sm font-medium">
        Running tasks ({activelyTrackedTasks.length})
      </h2>
      <Button variant="ghost" size="sm" aria-expanded={expanded} aria-controls={`${headingId}-tasks`} onClick={() => setExpanded(value => !value)}>{expanded ? 'Hide trackers' : 'Show trackers'}</Button>
      </div>
      {error && <p role="alert" className="mx-auto mt-1 max-w-5xl text-xs text-destructive">Running tasks could not be refreshed.</p>}
      {!expanded && Object.values(errors).some(Boolean) && <p role="alert" className="mx-auto mt-1 max-w-5xl text-xs text-destructive">A task could not be stopped. Show trackers to retry.</p>}
      <div id={`${headingId}-tasks`} className="mx-auto max-w-5xl" hidden={!expanded}>
      <p className="mt-1 text-xs text-muted-foreground">
        Stopping task tracking doesn’t pause a Pomodoro. Overlapping task times count separately.
      </p>
      <ul className="mt-2 grid min-w-0 gap-2 lg:grid-cols-3">
        {activelyTrackedTasks.map(task => {
          const startedAt = task.trackingStartedAt!;
          const projectName = projects.find(project => project.id === task.projectId)?.name ?? 'Inbox';
          const isPending = pending.has(task.id);
          return (
            <li key={task.id} className="min-w-0 rounded-md border px-3 py-2">
              <p className="whitespace-pre-wrap break-words text-sm font-medium [overflow-wrap:anywhere]">{task.title}</p>
              <p className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">{projectName}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-sm tabular-nums" aria-label={`Elapsed time for ${task.title}`}>
                  {formatTime(getElapsedTime(task))}
                </span>
                <span className="text-xs text-muted-foreground">
                  Started <time dateTime={startedAt.toISOString()} title={startedAt.toLocaleString()}>{startedAt.toLocaleTimeString()}</time>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Stop tracking ${task.title}`}
                  aria-busy={isPending}
                  disabled={isPending}
                  onClick={() => void stopTask(task)}
                >
                  <Square aria-hidden="true" className="mr-1 h-3 w-3" />
                  {isPending ? 'Stopping…' : 'Stop'}
                </Button>
              </div>
              {errors[task.id] && <p role="alert" className="mt-1 text-xs text-destructive">{errors[task.id]}</p>}
            </li>
          );
        })}
      </ul>
      </div>
    </section>
  );
}
