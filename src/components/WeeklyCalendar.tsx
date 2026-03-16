import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTasks, Task } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { Button } from '@/components/ui/button';
import { MobileButton } from '@/components/ui/mobile-button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus, Calendar, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import CalendarTaskForm from './CalendarTaskForm';
import CalendarTaskItem from './CalendarTaskItem';
import { useLabels } from '@/hooks/useLabels';

interface PomodoroSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
}

interface WeeklyCalendarProps {
  settings: PomodoroSettings;
}

interface CalendarTask extends Task {
  scheduledDate?: string;
  scheduledTime?: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function WeeklyCalendar({ settings }: WeeklyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedDayTasks, setSelectedDayTasks] = useState<CalendarTask[]>([]);

  const { projects, addProject } = useProjects();
  const { labels } = useLabels();
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    toggleTaskFocus,
    setTaskDeadline,
  } = useTasks();
  const { event } = useGoogleAnalytics();

  // Get start of current week (Sunday)
  const getWeekStart = useCallback((date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }, []);

  // Get all days in current week
  const weekDays = useMemo(() => {
    const start = getWeekStart(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate, getWeekStart]);

  // Format date as YYYY-MM-DD
  const formatDate = useCallback((date: Date) => {
    return date.toISOString().split('T')[0];
  }, []);

  // Organize tasks by date
  const tasksByDate = useMemo(() => {
    const organized: Record<string, CalendarTask[]> = {};
    
    tasks.forEach((task) => {
      // Convert task to CalendarTask
      const calendarTask: CalendarTask = {
        ...task,
        scheduledDate: task.deadline ? formatDate(new Date(task.deadline)) : undefined,
      };

      // If task has a deadline, place it on that date
      if (calendarTask.scheduledDate) {
        if (!organized[calendarTask.scheduledDate]) {
          organized[calendarTask.scheduledDate] = [];
        }
        organized[calendarTask.scheduledDate].push(calendarTask);
      }
      
      // If task is focused (today's focus), also add to today
      if (task.focus && !task.completed) {
        const today = formatDate(new Date());
        if (!organized[today]) {
          organized[today] = [];
        }
        // Only add if not already there (to avoid duplicates)
        if (!organized[today].find(t => t.id === task.id)) {
          organized[today].push(calendarTask);
        }
      }
    });

    return organized;
  }, [tasks, formatDate]);

  // Navigate weeks
  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
    event('calendar_week_navigate', { direction });
  }, [currentDate, event]);

  // Go to current week
  const goToCurrentWeek = useCallback(() => {
    setCurrentDate(new Date());
    event('calendar_goto_current_week', {});
  }, [event]);

  // Handle day click
  const handleDayClick = useCallback((date: Date) => {
    const dateStr = formatDate(date);
    setSelectedDate(dateStr);
    setSelectedDayTasks(tasksByDate[dateStr] || []);
    event('calendar_day_click', { date: dateStr });
  }, [formatDate, tasksByDate, event]);

  // Handle task creation from calendar
  const handleCreateTask = useCallback(async (taskData: {
    title: string;
    projectId: string;
    estimatedPomodoros?: number;
    focus?: boolean;
    labelIds?: string[];
    scheduledDate?: string;
    scheduledTime?: string;
  }) => {
    try {
      // Create the task first
      const taskId = await addTask(
        taskData.title, 
        taskData.projectId, 
        taskData.estimatedPomodoros, 
        taskData.focus,
        taskData.labelIds
      );

      // If we have a scheduled date, set it as the deadline
      if (taskId && taskData.scheduledDate) {
        await setTaskDeadline(taskId, taskData.scheduledDate);
      }

      event('calendar_task_created', {
        scheduled_date: taskData.scheduledDate,
        scheduled_time: taskData.scheduledTime,
        project_id: taskData.projectId,
        has_deadline: !!taskData.scheduledDate,
      });

      setShowTaskForm(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  }, [addTask, setTaskDeadline, event]);

  // Handle task update
  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<CalendarTask>) => {
    try {
      // Convert scheduledDate back to deadline if provided
      const taskUpdates: any = { ...updates };
      if (updates.scheduledDate !== undefined) {
        taskUpdates.deadline = updates.scheduledDate;
        delete taskUpdates.scheduledDate;
      }
      if (updates.scheduledTime !== undefined) {
        // For now, we don't store scheduled time separately
        // Could be added to the task schema later
        delete taskUpdates.scheduledTime;
      }

      await updateTask(taskId, taskUpdates);
      event('calendar_task_updated', { task_id: taskId });
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }, [updateTask, event]);

  // Handle task deletion
  const handleTaskDelete = useCallback(async (taskId: string) => {
    try {
      await deleteTask(taskId);
      event('calendar_task_deleted', { task_id: taskId });
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }, [deleteTask, event]);

  // Get project name by ID
  const getProjectName = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  }, [projects]);

  // Get label by ID
  const getLabelById = useCallback((labelId: string) => {
    return labels.find(l => l.id === labelId);
  }, [labels]);

  if (tasksLoading) return <div>Loading calendar...</div>;
  if (tasksError) return <div>Error loading calendar: {tasksError.message}</div>;

  const today = new Date();
  const todayStr = formatDate(today);
  const isCurrentWeek = weekDays.some(day => formatDate(day) === todayStr);

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <MobileButton
                variant="outline"
                size="icon"
                onClick={() => navigateWeek('prev')}
                aria-label="Previous week"
              >
                <ChevronLeft className="w-4 h-4" />
              </MobileButton>
              
              <div className="text-center">
                <CardTitle className="text-xl">
                  {weekDays[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {' '}
                  {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>

              <MobileButton
                variant="outline"
                size="icon"
                onClick={() => navigateWeek('next')}
                aria-label="Next week"
              >
                <ChevronRight className="w-4 h-4" />
              </MobileButton>
            </div>

            <div className="flex items-center space-x-2">
              {!isCurrentWeek && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToCurrentWeek}
                >
                  Today
                </Button>
              )}
              <Button
                onClick={() => setShowTaskForm(true)}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Calendar Grid */}
        <CardContent>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Day Headers */}
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {weekDays.map((day) => {
              const dayStr = formatDate(day);
              const isToday = dayStr === todayStr;
              const dayTasks = tasksByDate[dayStr] || [];
              const isSelected = selectedDate === dayStr;

              return (
                <div
                  key={dayStr}
                  className={cn(
                    "min-h-[120px] p-2 border rounded-lg cursor-pointer transition-colors",
                    isToday && "bg-blue-50 border-blue-200",
                    isSelected && "ring-2 ring-blue-500",
                    !isToday && !isSelected && "hover:bg-gray-50"
                  )}
                  onClick={() => handleDayClick(day)}
                >
                  {/* Day Number */}
                  <div className={cn(
                    "text-sm font-medium mb-2",
                    isToday && "text-blue-600"
                  )}>
                    {day.getDate()}
                  </div>

                  {/* Tasks for this day */}
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={`${dayStr}-${task.id}`}
                        className={cn(
                          "text-xs p-1 rounded truncate",
                          task.completed 
                            ? "bg-green-100 text-green-800 line-through"
                            : task.focus 
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-700"
                        )}
                        title={task.title}
                      >
                        {task.focus && <Star className="w-3 h-3 inline mr-1" />}
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Tasks */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>
                Tasks for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDayTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tasks scheduled for this day</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setShowTaskForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayTasks.map((task) => (
                  <CalendarTaskItem
                    key={task.id}
                    task={task}
                    onToggleComplete={(completed) => toggleTaskCompletion(task.id, !completed)}
                    onToggleFocus={(focus) => toggleTaskFocus(task.id, !focus)}
                    onUpdate={(updates) => handleTaskUpdate(task.id, updates)}
                    onDelete={() => handleTaskDelete(task.id)}
                    getProjectName={getProjectName}
                    getLabelById={getLabelById}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Task Form Modal */}
      {showTaskForm && (
        <CalendarTaskForm
          isOpen={showTaskForm}
          onClose={() => setShowTaskForm(false)}
          onSave={handleCreateTask}
          projects={projects}
          labels={labels}
          selectedDate={selectedDate}
          onCreateProject={addProject}
        />
      )}
    </div>
  );
}