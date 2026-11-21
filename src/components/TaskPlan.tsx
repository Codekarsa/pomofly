import React, { useId, useState } from 'react';
import { Task } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { formatTaskDate, taskDateKey } from '@/lib/taskDates';

interface TaskPlanProps {
  tasks: Task[];
  days?: string[];
  renderTask: (task: Task) => React.ReactNode;
  onAdd: (day: string) => void;
  onShowAll: () => void;
}

export default function TaskPlan({ tasks, days, renderTask, onAdd, onShowAll }: TaskPlanProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const planId = useId();
  if (!days) return <ul className="space-y-2">{tasks.map(renderTask)}</ul>;
  const earlier = tasks.filter(task => task.plannedFor && task.plannedFor < days[0]);
  const later = tasks.filter(task => task.plannedFor && task.plannedFor > days[days.length - 1]);
  const groups = [
    ...(earlier.length ? [{ key: 'earlier', label: 'Earlier · ready to reschedule', tasks: earlier }] : []),
    ...days.map(day => ({ key: day, label: `${day === taskDateKey(new Date()) ? 'Today · ' : ''}${formatTaskDate(day)}`, tasks: tasks.filter(task => task.plannedFor === day) })),
    { key: '', label: 'Unscheduled', tasks: tasks.filter(task => !task.plannedFor) },
  ];

  return (
    <div className="space-y-3" aria-label="Task plan">
      {days.length === 7 && <nav aria-label="Days in this plan" className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {groups.filter(group => days.includes(group.key)).map(group => <Button
          key={group.key}
          variant="outline"
          className="h-auto min-w-0 flex-col items-start whitespace-normal p-2 text-left"
          onClick={() => {
            const section = document.getElementById(`${planId}-${group.key}`);
            section?.focus({ preventScroll: true });
            section?.scrollIntoView({ block: 'start', behavior: 'smooth' });
          }}
          aria-label={`Go to ${group.label}: ${group.tasks.length} task${group.tasks.length === 1 ? '' : 's'}`}
        >
          <span className="font-semibold">{formatTaskDate(group.key)}</span>
          <span className="text-xs text-muted-foreground">{group.tasks.length} task{group.tasks.length === 1 ? '' : 's'}</span>
        </Button>)}
      </nav>}
      {groups.map(group => {
        const estimated = group.tasks.reduce((total, task) => total + (task.estimatedPomodoros || 0), 0);
        const unestimated = group.tasks.filter(task => !task.estimatedPomodoros).length;
        const visible = expandedDays.has(group.key) ? group.tasks : group.tasks.slice(0, 5);
        return (
          <section key={group.key} id={`${planId}-${group.key}`} tabIndex={-1} aria-label={group.label} className="scroll-mt-3 border-t py-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <h3 className="font-semibold text-sm">{group.label}</h3>
                <p className="text-xs text-muted-foreground">
                  {group.tasks.length} task{group.tasks.length === 1 ? '' : 's'}
                  {estimated > 0 && ` · ${estimated} estimated focus sessions`}
                  {unestimated > 0 && ` · ${unestimated} without estimates`}
                </p>
              </div>
              {group.key !== 'earlier' && <Button size="sm" variant="outline" onClick={() => onAdd(group.key)} aria-label={`Add task to ${group.label}`}>+ Add task</Button>}
            </div>
            {visible.length ? <ul>{visible.map(renderTask)}</ul> : <p className="text-xs text-muted-foreground py-2">{group.key ? 'Room for work, and life.' : 'Tasks without a planned day appear here.'}</p>}
            {visible.length < group.tasks.length && <Button variant="ghost" size="sm" className="mt-2" onClick={() => setExpandedDays(previous => new Set(previous).add(group.key))}>Show all {group.tasks.length} tasks</Button>}
          </section>
        );
      })}
      {later.length > 0 && <p className="text-sm text-muted-foreground">{later.length} tasks planned after this view. <button type="button" className="underline text-foreground" onClick={onShowAll}>See all tasks</button></p>}
    </div>
  );
}
