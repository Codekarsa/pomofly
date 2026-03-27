'use client'

import React, { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { Task } from '@/hooks/useTasks';
import TaskItem from './TaskItem';

interface VirtualizedTaskListProps {
  tasks: Task[];
  selectedTasks: Set<string>;
  editingTask: { id: string; title: string; estimatedPomodoros?: number; projectId?: string; labelIds?: string[] } | null;
  editingDeadline: { id: string; deadline: string } | null;
  projects: Array<{ id: string; name: string }>;
  getProjectName: (projectId: string) => string;
  formatTime: (seconds: number) => string;
  getElapsedTime: (task: Task) => number;
  onToggleSelection: (taskId: string) => void;
  onToggleCompletion: (taskId: string, completed: boolean) => void;
  onToggleFocus: (taskId: string, focus: boolean) => void;
  onStartEdit: (task: Task) => void;
  onUpdateEditingTask: (data: any) => void;
  onSubmitEdit: () => Promise<void>;
  onCancelEdit: () => void;
  onStartEditDeadline: (task: Task) => void;
  onSetDeadline: (taskId: string, deadline: string | null) => void;
  onCancelEditDeadline: () => void;
  onDelete: (taskId: string) => void;
  onStartTracking: (taskId: string) => void;
  onStopTracking: (task: Task) => void;
  onCreateProject: (name: string) => Promise<void>;
  onAnalyticsEvent: (action: string, params: object) => void;
  hasNextPage?: boolean;
  loadNextPage?: () => void;
  loadingMore?: boolean;
  itemHeight?: number;
  height?: number;
}

// Performance monitoring hook
function usePerformanceMonitor(enabled: boolean = false) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  useEffect(() => {
    if (!enabled) return;
    
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    if (renderCount.current % 50 === 0) {
      console.log(`VirtualizedTaskList: ${renderCount.current} renders, last render took ${timeSinceLastRender}ms`);
    }
    
    lastRenderTime.current = now;
  });
  
  return { renderCount: renderCount.current };
}

/**
 * Individual task row component for virtualization
 */
const TaskRow = memo(({ index, style, data }: ListChildComponentProps) => {
  const {
    tasks,
    selectedTasks,
    editingTask,
    editingDeadline,
    projects,
    getProjectName,
    formatTime,
    getElapsedTime,
    callbacks
  } = data;
  
  const task = tasks[index];
  
  if (!task) {
    // Loading placeholder
    return (
      <div style={style} className="p-2">
        <div className="animate-pulse flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="flex-1 h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  const projectName = getProjectName(task.projectId);
  const formattedTime = formatTime(getElapsedTime(task));
  const elapsedTime = getElapsedTime(task);
  const isTracking = task.trackingStartedAt != null;
  const isSelected = selectedTasks.has(task.id);
  const isEditing = editingTask?.id === task.id;
  const isEditingDeadline = editingDeadline?.id === task.id;
  
  return (
    <div style={style} className="px-2">
      <TaskItem
        task={task}
        isSelected={isSelected}
        isEditing={isEditing}
        isEditingDeadline={isEditingDeadline}
        projectName={projectName}
        formattedTime={formattedTime}
        elapsedTime={elapsedTime}
        isTracking={isTracking}
        editingData={editingTask}
        deadlineData={editingDeadline}
        projects={projects}
        onToggleSelection={callbacks.onToggleSelection}
        onToggleCompletion={callbacks.onToggleCompletion}
        onToggleFocus={callbacks.onToggleFocus}
        onStartEdit={callbacks.onStartEdit}
        onUpdateTask={callbacks.onUpdateEditingTask}
        onStartEditDeadline={callbacks.onStartEditDeadline}
        onSetDeadline={callbacks.onSetDeadline}
        onDelete={callbacks.onDelete}
        onStartTracking={callbacks.onStartTracking}
        onStopTracking={callbacks.onStopTracking}
        onCreateProject={callbacks.onCreateProject}
        onCancelEdit={callbacks.onCancelEdit}
        onCancelEditDeadline={callbacks.onCancelEditDeadline}
        onAnalyticsEvent={callbacks.onAnalyticsEvent}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the task data for this index has changed
  const prevTask = prevProps.data.tasks[prevProps.index];
  const nextTask = nextProps.data.tasks[nextProps.index];
  
  if (!prevTask && !nextTask) return true;
  if (!prevTask || !nextTask) return false;
  
  return (
    prevTask.id === nextTask.id &&
    prevTask.title === nextTask.title &&
    prevTask.completed === nextTask.completed &&
    prevTask.focus === nextTask.focus &&
    prevTask.deadline === nextTask.deadline &&
    prevTask.totalPomodoroSessions === nextTask.totalPomodoroSessions &&
    prevTask.estimatedPomodoros === nextTask.estimatedPomodoros &&
    prevTask.trackingStartedAt === nextTask.trackingStartedAt &&
    JSON.stringify(prevTask.labelIds) === JSON.stringify(nextTask.labelIds) &&
    prevProps.data.selectedTasks.has(prevTask.id) === nextProps.data.selectedTasks.has(nextTask.id) &&
    prevProps.data.editingTask?.id === nextProps.data.editingTask?.id &&
    prevProps.data.editingDeadline?.id === nextProps.data.editingDeadline?.id
  );
});

TaskRow.displayName = 'TaskRow';

/**
 * Virtualized Task List Component
 * Efficiently handles large task datasets with virtual scrolling
 */
const VirtualizedTaskList: React.FC<VirtualizedTaskListProps> = memo(({
  tasks,
  selectedTasks,
  editingTask,
  editingDeadline,
  projects,
  getProjectName,
  formatTime,
  getElapsedTime,
  onToggleSelection,
  onToggleCompletion,
  onToggleFocus,
  onStartEdit,
  onUpdateEditingTask,
  onSubmitEdit,
  onCancelEdit,
  onStartEditDeadline,
  onSetDeadline,
  onCancelEditDeadline,
  onDelete,
  onStartTracking,
  onStopTracking,
  onCreateProject,
  onAnalyticsEvent,
  hasNextPage = false,
  loadNextPage,
  loadingMore = false,
  itemHeight = 70,
  height = 400,
}) => {
  const listRef = useRef<List>(null);
  const { renderCount } = usePerformanceMonitor(process.env.NODE_ENV === 'development');
  
  // Memoize the callback object to prevent unnecessary re-renders
  const callbacks = useMemo(() => ({
    onToggleSelection,
    onToggleCompletion,
    onToggleFocus,
    onStartEdit,
    onUpdateEditingTask,
    onStartEditDeadline,
    onSetDeadline,
    onDelete,
    onStartTracking,
    onStopTracking,
    onCreateProject,
    onCancelEdit,
    onCancelEditDeadline,
    onAnalyticsEvent,
  }), [
    onToggleSelection,
    onToggleCompletion,
    onToggleFocus,
    onStartEdit,
    onUpdateEditingTask,
    onStartEditDeadline,
    onSetDeadline,
    onDelete,
    onStartTracking,
    onStopTracking,
    onCreateProject,
    onCancelEdit,
    onCancelEditDeadline,
    onAnalyticsEvent,
  ]);
  
  // Memoize the data object passed to each row
  const rowData = useMemo(() => ({
    tasks,
    selectedTasks,
    editingTask,
    editingDeadline,
    projects,
    getProjectName,
    formatTime,
    getElapsedTime,
    callbacks,
  }), [
    tasks,
    selectedTasks,
    editingTask,
    editingDeadline,
    projects,
    getProjectName,
    formatTime,
    getElapsedTime,
    callbacks,
  ]);
  
  // Calculate total item count (current tasks + potential loading items)
  const itemCount = hasNextPage ? tasks.length + 1 : tasks.length;
  
  // Check if an item is loaded
  const isItemLoaded = useCallback((index: number) => {
    return index < tasks.length;
  }, [tasks.length]);
  
  // Handle loading more items
  const handleLoadMoreItems = useCallback(async () => {
    if (loadNextPage && !loadingMore) {
      try {
        await loadNextPage();
        onAnalyticsEvent('task_list_load_more', { 
          current_count: tasks.length,
          render_count: renderCount 
        });
      } catch (error) {
        console.error('Error loading more tasks:', error);
      }
    }
  }, [loadNextPage, loadingMore, onAnalyticsEvent, tasks.length, renderCount]);
  
  // Scroll to specific task (useful for focusing on newly created tasks)
  const scrollToTask = useCallback((taskId: string) => {
    const index = tasks.findIndex(task => task.id === taskId);
    if (index !== -1 && listRef.current) {
      listRef.current.scrollToItem(index, 'smart');
    }
  }, [tasks]);
  
  // Performance optimization: avoid rendering if no tasks
  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        No tasks to display
      </div>
    );
  }
  
  // For small lists, render normally to avoid virtualization overhead
  if (tasks.length <= 20) {
    return (
      <ul className="space-y-2">
        {tasks.map((task, index) => (
          <TaskRow
            key={task.id}
            index={index}
            style={{}}
            data={rowData}
          />
        ))}
      </ul>
    );
  }
  
  // Use virtualization for large lists
  if (hasNextPage && loadNextPage) {
    return (
      <div className="border rounded-md">
        <InfiniteLoader
          isItemLoaded={isItemLoaded}
          itemCount={itemCount}
          loadMoreItems={handleLoadMoreItems}
        >
          {({ onItemsRendered, ref }) => (
            <List
              ref={(list) => {
                listRef.current = list;
                ref(list);
              }}
              height={height}
              itemCount={itemCount}
              itemSize={itemHeight}
              itemData={rowData}
              onItemsRendered={onItemsRendered}
              overscanCount={5}
            >
              {TaskRow}
            </List>
          )}
        </InfiniteLoader>
      </div>
    );
  }
  
  // Regular virtualized list without infinite loading
  return (
    <div className="border rounded-md">
      <List
        ref={listRef}
        height={height}
        itemCount={tasks.length}
        itemSize={itemHeight}
        itemData={rowData}
        overscanCount={5}
      >
        {TaskRow}
      </List>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.tasks.length === nextProps.tasks.length &&
    prevProps.selectedTasks.size === nextProps.selectedTasks.size &&
    prevProps.editingTask?.id === nextProps.editingTask?.id &&
    prevProps.editingDeadline?.id === nextProps.editingDeadline?.id &&
    prevProps.hasNextPage === nextProps.hasNextPage &&
    prevProps.loadingMore === nextProps.loadingMore &&
    // Deep comparison for tasks would be too expensive, so we rely on the tasks.length check
    // and the individual TaskRow memoization
    true
  );
});

VirtualizedTaskList.displayName = 'VirtualizedTaskList';

export default VirtualizedTaskList;