import React, { useMemo, useCallback, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Task } from '../hooks/useTasks';

interface VirtualTaskListProps {
  tasks: Task[];
  height: number;
  itemHeight: number;
  onToggleCompletion: (taskId: string, completed: boolean) => void;
  onToggleFocus: (taskId: string, focus: boolean) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  selectedTasks: Set<string>;
  onToggleSelection: (taskId: string) => void;
  renderTaskItem: (props: any) => React.ReactElement;
}

const VirtualTaskList: React.FC<VirtualTaskListProps> = React.memo(({
  tasks,
  height,
  itemHeight,
  onToggleCompletion,
  onToggleFocus,
  onEditTask,
  onDeleteTask,
  selectedTasks,
  onToggleSelection,
  renderTaskItem
}) => {
  const ItemRenderer = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const task = tasks[index];
    
    return (
      <div style={style}>
        {renderTaskItem({
          task,
          isSelected: selectedTasks.has(task.id),
          onToggleCompletion: () => onToggleCompletion(task.id, task.completed),
          onToggleFocus: () => onToggleFocus(task.id, task.focus || false),
          onEditTask: () => onEditTask(task),
          onDeleteTask: () => onDeleteTask(task.id),
          onToggleSelection: () => onToggleSelection(task.id)
        })}
      </div>
    );
  }, [tasks, selectedTasks, onToggleCompletion, onToggleFocus, onEditTask, onDeleteTask, onToggleSelection, renderTaskItem]);

  if (tasks.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No tasks found</div>;
  }

  return (
    <List
      height={height}
      itemCount={tasks.length}
      itemSize={itemHeight}
      itemData={tasks}
      overscanCount={5} // Render 5 extra items outside visible area for smooth scrolling
    >
      {ItemRenderer}
    </List>
  );
});

VirtualTaskList.displayName = 'VirtualTaskList';

export default VirtualTaskList;