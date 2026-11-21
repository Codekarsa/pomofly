'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { type Task } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { formatTaskDate, taskDateKey } from '@/lib/taskDates';

export function DailyProgress({ count }: { count: number }) {
  return (
    <aside aria-label="Daily focus progress" className="flex items-center gap-4 border-t pt-6 lg:block lg:border-0 lg:pt-2">
      <svg viewBox="0 0 80 80" fill="none" className="h-20 w-20 shrink-0 text-primary" aria-hidden="true">
        <path d="M15 71h50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {count === 0 ? <path d="M35 64c-3-9 4-14 9-14 3 8-1 14-9 14Z" fill="hsl(var(--secondary))" stroke="currentColor" strokeWidth="1.5" /> : <>
          <path d="M40 70V29" stroke="currentColor" strokeWidth="2" />
          <path d="M40 48C20 50 15 36 19 26c15 1 23 8 21 22Z" fill="hsl(var(--secondary))" stroke="currentColor" strokeWidth="1.5" />
          {count >= 2 && <path d="M40 36C36 20 47 12 60 11c4 15-4 26-20 25Z" fill="hsl(var(--secondary))" stroke="currentColor" strokeWidth="1.5" />}
          {count >= 3 && <path d="M41 59c0-14 12-20 23-15 0 12-10 19-23 15Z" fill="currentColor" />}
          {count >= 4 && <path d="M39 62C24 65 16 57 15 48c13-3 23 3 24 14Z" fill="currentColor" />}
        </>}
      </svg>
      <div>
        <h2 className="mb-1 text-base font-medium">{count === 0 ? 'Room to grow.' : count >= 4 ? 'Your little steps added up.' : 'Little steps add up.'}</h2>
        <p className="text-sm text-muted-foreground"><span>{count}</span> focused {count === 1 ? 'session' : 'sessions'} today</p>
        <div className="my-3 flex gap-1.5" role="progressbar" aria-label="Daily focus goal" aria-valuenow={Math.min(count, 4)} aria-valuemin={0} aria-valuemax={4}>
          {[0, 1, 2, 3].map(index => <span key={index} className={`h-1.5 w-9 rounded-full ${index < count ? 'bg-primary' : 'bg-border'}`} />)}
        </div>
        <p className="max-w-56 text-xs leading-relaxed text-muted-foreground">{count >= 4 ? 'You met your gentle goal. Make room for rest, too.' : 'A gentle goal of 4. No streak to lose.'}</p>
      </div>
    </aside>
  );
}

interface MyDayProps {
  tasks: Task[];
  projects: { id: string; name: string }[];
  selectedTaskIds: string[];
  sessions: number;
  onBeginFocus: (taskId?: string) => void;
  taskPicker: ReactNode;
}

export default function MyDay({ tasks, projects, selectedTaskIds, sessions, onBeginFocus, taskPicker }: MyDayProps) {
  const [choosingTask, setChoosingTask] = useState(false);
  const today = taskDateKey(new Date());
  const available = tasks.filter(task => !task.completed).sort((a, b) => {
    // Prefer work planned for today/earlier, then priorities, without changing anyone's plan.
    const rank = (task: Task) => task.plannedFor && task.plannedFor <= today ? 0 : task.focus ? 1 : !task.plannedFor ? 2 : 3;
    return rank(a) - rank(b);
  });
  const task = available.find(item => selectedTaskIds.includes(item.id)) ?? available[0];
  const nextTasks = available.filter(item => item.id !== task?.id).slice(0, 2);
  const projectName = (projectId: string) => projects.find(project => project.id === projectId)?.name || 'Inbox';

  return (
    <section aria-label="My day">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-3 text-sm text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="font-display mb-3 text-4xl sm:text-5xl">A good day starts small.</h1>
          <p className="text-sm text-muted-foreground">Choose one thing. Give it your attention.</p>
        </div>
        {task && <Button variant="ghost" onClick={() => setChoosingTask(value => !value)}>{choosingTask ? 'Close task picker' : '+ Choose or create task'}</Button>}
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-12">
        <div className="min-w-0">
          <div className="rounded-2xl border bg-card p-6 sm:p-8">
            <p className="mb-4 text-xs text-muted-foreground">Your next small step</p>
            {task ? <>
              <p className="mb-2 text-xs text-muted-foreground">{projectName(task.projectId)}{task.plannedFor ? ` · Planned ${formatTaskDate(task.plannedFor)}` : ''}</p>
              <h2 className="mb-3 break-words text-2xl font-medium tracking-tight [overflow-wrap:anywhere] sm:text-3xl">{task.title}</h2>
              {selectedTaskIds.length > 1 && <p className="text-xs text-muted-foreground">{selectedTaskIds.length} tasks selected for your next session. You can change them in the timer.</p>}
            </> : <>
              <h2 className="mb-3 text-2xl font-medium">What would you like to work on?</h2>
              <p className="text-sm text-muted-foreground">Choose or create a task below, or begin a session without one.</p>
            </>}
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Button size="lg" onClick={() => onBeginFocus(task?.id)}><Play className="mr-2 h-4 w-4" aria-hidden="true" />Begin focus</Button>
              <span className="text-xs text-muted-foreground">One session, then a break</span>
            </div>
          </div>
          {(choosingTask || !task) && <div className="mt-4">{taskPicker}</div>}
          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium">Up next in your plan</h2>
              <Link href="/tasks?view=week" className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground hover:text-foreground">See plan<ArrowRight className="h-3 w-3" aria-hidden="true" /></Link>
            </div>
            {nextTasks.map(item => <div key={item.id} className="flex items-center justify-between gap-3 border-t py-4">
              <div className="min-w-0"><p className="break-words text-sm [overflow-wrap:anywhere]">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{projectName(item.projectId)}{item.plannedFor ? ` · ${formatTaskDate(item.plannedFor)}` : ''}</p></div>
              <Button variant="ghost" size="sm" onClick={() => onBeginFocus(item.id)} aria-label={`Focus on ${item.title}`}>Focus</Button>
            </div>)}
            {!nextTasks.length && <p className="border-t py-4 text-sm text-muted-foreground">Leave a little space for the unexpected.</p>}
          </div>
        </div>
        <DailyProgress count={sessions} />
      </div>
    </section>
  );
}
