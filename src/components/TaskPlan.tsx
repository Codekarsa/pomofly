import React, { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Task } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatTaskDate, shiftTaskDate, shiftTaskMonth, startOfTaskWeek, taskDateKey } from '@/lib/taskDates';

// Custom type so dropping arbitrary text on a day does nothing.
export const TASK_DRAG_TYPE = 'application/x-pomofly-task';

interface TaskPlanProps {
  tasks: Task[];
  days?: string[];
  layout?: 'list' | 'week' | 'calendar';
  renderTask: (task: Task, compact?: boolean) => React.ReactNode;
  onAdd: (day: string) => void;
  onShowAll: () => void;
  onMove?: (taskId: string, day: string) => void;
  calendarMonth?: string;
  onCalendarMonthChange?: (month: string) => void;
  onSelectDay?: (day: string) => void;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
const sessions = (tasks: Task[]) => tasks.reduce((total, task) => total + (task.estimatedPomodoros || 0), 0);

export default function TaskPlan({ tasks, days, layout = 'list', renderTask, onAdd, onShowAll, onMove, calendarMonth, onCalendarMonthChange, onSelectDay }: TaskPlanProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  if (!days) return <ul className="space-y-2">{tasks.map(task => renderTask(task))}</ul>;
  const today = taskDateKey(new Date());
  const tasksOn = (day: string) => tasks.filter(task => (task.plannedFor || '') === day);
  const dayLabel = (day: string) => `${day === today ? 'Today · ' : ''}${formatTaskDate(day)}`;
  const visibleTasks = (key: string, list: Task[]) => expandedDays.has(key) ? list : list.slice(0, 5);
  const showAllButton = (key: string, list: Task[]) => list.length > 5 && !expandedDays.has(key) &&
    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setExpandedDays(previous => new Set(previous).add(key))}>Show all {list.length} tasks</Button>;

  // '' is the Unscheduled drop target.
  const dropProps = (day: string) => onMove ? {
    onDragOver: (e: React.DragEvent) => {
      if (!Array.from(e.dataTransfer.types).includes(TASK_DRAG_TYPE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDropTarget(day);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget(current => current === day ? null : current);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDropTarget(null);
      const id = e.dataTransfer.getData(TASK_DRAG_TYPE);
      if (id) onMove(id, day);
    },
  } : {};
  const dropHighlight = (day: string) => dropTarget === day && 'ring-2 ring-primary ring-offset-1 bg-secondary/60';

  const listSection = (key: string, label: string, list: Task[], addDay?: string) => {
    const estimated = sessions(list);
    const unestimated = list.filter(task => !task.estimatedPomodoros).length;
    const visible = visibleTasks(key, list);
    const droppable = key !== 'earlier';
    return (
      <section key={key} aria-label={label} className={cn('scroll-mt-3 rounded-md border-t py-3 transition-shadow', droppable && dropHighlight(key))} {...(droppable ? dropProps(key) : {})}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div>
            <h3 className="font-semibold text-sm">{label}</h3>
            <p className="text-xs text-muted-foreground">
              {plural(list.length, 'task')}
              {estimated > 0 && ` · ${estimated} estimated focus sessions`}
              {unestimated > 0 && ` · ${unestimated} without estimates`}
            </p>
          </div>
          {addDay !== undefined && <Button size="sm" variant="outline" onClick={() => onAdd(addDay)} aria-label={`Add task to ${label}`}>+ Add task</Button>}
        </div>
        {visible.length ? <ul>{visible.map(task => renderTask(task))}</ul> : <p className="text-xs text-muted-foreground py-2">{key ? 'Room for work, and life.' : `Tasks without a planned day appear here.${onMove ? ' Drag tasks here to unschedule them.' : ''}`}</p>}
        {showAllButton(key, list)}
      </section>
    );
  };

  const unscheduled = tasksOn('');

  if (layout === 'calendar' && calendarMonth && onCalendarMonthChange && onSelectDay) {
    const selectedDay = days[0];
    const gridStart = startOfTaskWeek(calendarMonth);
    const gridEnd = shiftTaskDate(startOfTaskWeek(shiftTaskDate(shiftTaskMonth(calendarMonth, 1), -1)), 6);
    const gridDays: string[] = [];
    for (let day = gridStart; day <= gridEnd; day = shiftTaskDate(day, 1)) gridDays.push(day);
    const [year, month] = calendarMonth.split('-').map(Number);
    const monthLabel = new Date(year, month - 1, 1, 12).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const monthPrefix = calendarMonth.slice(0, 7);
    const monthTasks = tasks.filter(task => task.plannedFor?.startsWith(monthPrefix));
    const thisMonth = today.slice(0, 7) === monthPrefix;
    return (
      <div className="space-y-4" aria-label="Task calendar">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">{monthLabel}</h3>
            <p className="text-xs text-muted-foreground">{plural(monthTasks.length, 'task')} planned · {sessions(monthTasks)} estimated focus sessions</p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" aria-label="Previous month" onClick={() => onCalendarMonthChange(shiftTaskMonth(calendarMonth, -1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" disabled={thisMonth && selectedDay === today} aria-label="Go to today" onClick={() => { onCalendarMonthChange(shiftTaskMonth(today, 0)); onSelectDay(today); }}>Today</Button>
            <Button size="icon" variant="outline" aria-label="Next month" onClick={() => onCalendarMonthChange(shiftTaskMonth(calendarMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1" aria-hidden="true">
          {gridDays.slice(0, 7).map(day => <span key={day} className="px-1 text-center text-xs font-medium text-muted-foreground sm:text-left">{new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {gridDays.map(day => {
            const planned = tasksOn(day);
            const due = tasks.filter(task => task.deadline === day).length;
            const inMonth = day.startsWith(monthPrefix);
            const selected = day === selectedDay;
            return (
              <button
                key={day}
                type="button"
                aria-pressed={selected}
                aria-label={`${dayLabel(day)}: ${plural(planned.length, 'task')} planned${due ? `, ${due} due` : ''}`}
                onClick={() => { onSelectDay(day); if (!inMonth) onCalendarMonthChange(shiftTaskMonth(day, 0)); }}
                className={cn(
                  'flex min-h-16 min-w-0 flex-col gap-1 rounded-md border p-1 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-28',
                  inMonth ? 'bg-card' : 'bg-muted/50 text-muted-foreground',
                  selected && 'border-primary ring-1 ring-primary',
                  dropHighlight(day),
                )}
                {...dropProps(day)}
              >
                <span className="flex items-center justify-between gap-1">
                  <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium', day === today && 'bg-primary text-primary-foreground')}>{Number(day.slice(8))}</span>
                  {due > 0 && <span className="hidden truncate text-[10px] font-medium text-red-700 sm:inline">{due} due</span>}
                </span>
                <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                  {planned.slice(0, 3).map(task => <span key={task.id} className={cn('truncate rounded bg-secondary px-1 py-0.5 text-[11px] leading-tight text-secondary-foreground', task.focus && 'border-l-2 border-primary')}>{task.title}</span>)}
                  {planned.length > 3 && <span className="px-1 text-[11px] text-muted-foreground">+{planned.length - 3} more</span>}
                </span>
                {planned.length > 0 && <span className="flex flex-wrap gap-0.5 sm:hidden">
                  {planned.slice(0, 4).map(task => <span key={task.id} className="h-1.5 w-1.5 rounded-full bg-primary" />)}
                </span>}
              </button>
            );
          })}
        </div>
        {listSection(selectedDay, dayLabel(selectedDay), tasksOn(selectedDay), selectedDay)}
        {listSection('', 'Unscheduled', unscheduled, '')}
      </div>
    );
  }

  const earlier = tasks.filter(task => task.plannedFor && task.plannedFor < days[0]);
  const later = tasks.filter(task => task.plannedFor && task.plannedFor > days[days.length - 1]);
  const laterNotice = later.length > 0 && <p className="text-sm text-muted-foreground">{later.length} tasks planned after this view. <button type="button" className="underline text-foreground" onClick={onShowAll}>See all tasks</button></p>;

  if (layout === 'week') {
    const weekTasks = tasks.filter(task => task.plannedFor && task.plannedFor >= days[0] && task.plannedFor <= days[days.length - 1]);
    return (
      <div className="space-y-4" aria-label="Task plan">
        <p className="text-sm text-muted-foreground">
          {plural(weekTasks.length, 'task')} planned · {sessions(weekTasks)} estimated focus sessions · {unscheduled.length} unscheduled
          {onMove && <span className="hidden md:inline"> · Drag tasks between days to reschedule.</span>}
        </p>
        <div className="grid gap-2 md:grid-cols-7">
          {days.map(day => {
            const list = tasksOn(day);
            const estimated = sessions(list);
            const label = dayLabel(day);
            const isToday = day === today;
            const date = new Date(`${day}T12:00:00`);
            return (
              <section
                key={day}
                aria-label={label}
                className={cn('flex min-w-0 flex-col rounded-lg border bg-card p-2 transition-shadow md:min-h-64', isToday && 'border-primary', day < today && 'bg-muted/30', dropHighlight(day))}
                {...dropProps(day)}
              >
                <div className="flex items-start justify-between gap-1">
                  <h3 className="flex items-baseline gap-1.5 md:flex-col md:items-start md:gap-0">
                    <span className={cn('text-xs font-medium uppercase tracking-wide text-muted-foreground', isToday && 'text-primary')}>{isToday ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                    <span className={cn('text-lg font-semibold leading-tight', isToday && 'text-primary')}>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </h3>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => onAdd(day)} aria-label={`Add task to ${label}`}><Plus className="h-4 w-4" /></Button>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  {plural(list.length, 'task')}
                  {estimated > 0 && <> · <span aria-hidden="true">🍅</span> {estimated}<span className="sr-only"> estimated focus sessions</span></>}
                </p>
                {list.length ? <ul className="space-y-2">{visibleTasks(day, list).map(task => renderTask(task, true))}</ul> : <p className="py-2 text-xs text-muted-foreground">Room for work, and life.</p>}
                {showAllButton(day, list)}
              </section>
            );
          })}
        </div>
        {earlier.length > 0 && listSection('earlier', 'Earlier · ready to reschedule', earlier)}
        {listSection('', 'Unscheduled', unscheduled, '')}
        {laterNotice}
      </div>
    );
  }

  return (
    <div className="space-y-3" aria-label="Task plan">
      {earlier.length > 0 && listSection('earlier', 'Earlier · ready to reschedule', earlier)}
      {days.map(day => listSection(day, dayLabel(day), tasksOn(day), day))}
      {listSection('', 'Unscheduled', unscheduled, '')}
      {laterNotice}
    </div>
  );
}
