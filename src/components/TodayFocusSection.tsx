import React, { useMemo } from 'react';
import { useTasks } from '../hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Trash2, Star, Calendar } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PomodoroSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
}

interface TodayFocusSectionProps {
  settings: PomodoroSettings;
}

const TodayFocusSection: React.FC<TodayFocusSectionProps> = () => {
  const { tasks, loading, error, toggleTaskCompletion, toggleTaskFocus, setTaskDeadline, deleteTask } = useTasks();

  const focusedTasks = useMemo(() => {
    return tasks.filter(task => task.focus && !task.completed);
  }, [tasks]);

  // Debug logging
  console.log('TodayFocusSection Debug:', {
    totalTasks: tasks.length,
    focusedTasks: focusedTasks.length,
    loading,
    error,
    tasksWithFocus: tasks.filter(task => task.focus).length,
    allTasks: tasks.map(task => ({ id: task.id, title: task.title, focus: task.focus, completed: task.completed }))
  });

  if (loading) return <div>Loading focus section...</div>;
  if (error) return <div>Error loading focus section: {error.message}</div>;
  
  // Temporarily show even when no focused tasks for debugging
  return (
    <Card className="w-full mb-6 border-2 border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Star className="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" />
          Today&apos;s Focus
          <span className="ml-2 text-sm text-muted-foreground">
            ({focusedTasks.length} task{focusedTasks.length !== 1 ? 's' : ''})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {focusedTasks.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p>No tasks marked as &quot;Today&apos;s focus&quot; yet.</p>
            <p className="text-sm mt-1">Click the star button next to any task to mark it as focus.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {focusedTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between p-3 bg-white rounded-md border border-yellow-200 hover:bg-yellow-100 transition-colors">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTaskCompletion(task.id, task.completed)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleTaskFocus(task.id, task.focus || false)}
                    className="p-1 text-yellow-500"
                  >
                    <Star className="w-4 h-4" fill="currentColor" />
                  </Button>
                  <span className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({task.totalPomodoroSessions || 0}/{task.estimatedPomodoros || 0})
                  </span>
                  {task.deadline && (
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      new Date(task.deadline) < new Date() 
                        ? 'bg-red-100 text-red-800 border border-red-200' 
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {new Date(task.deadline).toLocaleDateString()}
                      {new Date(task.deadline) < new Date() && ' (Overdue)'}
                    </span>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      const newDeadline = prompt('Enter deadline (YYYY-MM-DD) or leave empty to remove:', task.deadline || '');
                      if (newDeadline !== null) {
                        setTaskDeadline(task.id, newDeadline || null);
                      }
                    }}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Set Deadline
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteTask(task.id)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayFocusSection; 