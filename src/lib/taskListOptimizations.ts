import { Task } from '../hooks/useTasks';
import { Project } from '../hooks/useProjects';

export interface TaskFilters {
  projectFilter: string;
  labelFilter: string;
  statusFilter: string;
  search: string;
}

export interface TaskSorting {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Memoized task filtering function
export const createTaskFilter = (filters: TaskFilters) => {
  const { projectFilter, labelFilter, statusFilter, search } = filters;
  
  return (task: Task): boolean => {
    // Project filter
    if (projectFilter !== 'all' && task.projectId !== projectFilter) {
      return false;
    }
    
    // Label filter
    if (labelFilter !== 'all' && (!task.labelIds || !task.labelIds.includes(labelFilter))) {
      return false;
    }
    
    // Status filter
    if (statusFilter === 'active' && task.completed) {
      return false;
    }
    if (statusFilter === 'completed' && !task.completed) {
      return false;
    }
    if (statusFilter === 'focused' && !task.focus) {
      return false;
    }
    
    // Search filter
    if (search.trim() && !task.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    
    return true;
  };
};

// Optimized task sorting function with memoized comparators
export const createTaskSorter = (sorting: TaskSorting, projects: Project[]) => {
  const { sortBy, sortOrder } = sorting;
  
  // Create project name lookup map for performance
  const projectNameMap = new Map<string, string>();
  projects.forEach(project => {
    projectNameMap.set(project.id, project.name);
  });
  
  const getProjectName = (projectId: string | undefined): string => {
    return projectId ? (projectNameMap.get(projectId) || '') : '';
  };
  
  return (a: Task, b: Task): number => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'deadline':
        const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
        const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
        comparison = aDeadline - bDeadline;
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'project':
        comparison = getProjectName(a.projectId).localeCompare(getProjectName(b.projectId));
        break;
      case 'focus':
        comparison = (b.focus ? 1 : 0) - (a.focus ? 1 : 0);
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  };
};

// Optimized task list processing pipeline
export interface ProcessTasksOptions {
  tasks: Task[];
  filters: TaskFilters;
  sorting: TaskSorting;
  projects: Project[];
  separateCompleted?: boolean;
}

export interface ProcessedTasks {
  activeTasks: Task[];
  completedTasks: Task[];
  totalCount: number;
  filteredCount: number;
}

export const processTaskList = ({
  tasks,
  filters,
  sorting,
  projects,
  separateCompleted = true
}: ProcessTasksOptions): ProcessedTasks => {
  // Create filter and sorter functions
  const taskFilter = createTaskFilter(filters);
  const taskSorter = createTaskSorter(sorting, projects);
  
  // Apply filtering
  const filteredTasks = tasks.filter(taskFilter);
  
  // Apply sorting
  const sortedTasks = [...filteredTasks].sort(taskSorter);
  
  if (separateCompleted) {
    // Separate active and completed tasks
    const activeTasks = sortedTasks.filter(task => !task.completed);
    const completedTasks = sortedTasks.filter(task => task.completed);
    
    return {
      activeTasks,
      completedTasks,
      totalCount: tasks.length,
      filteredCount: filteredTasks.length
    };
  } else {
    return {
      activeTasks: sortedTasks,
      completedTasks: [],
      totalCount: tasks.length,
      filteredCount: filteredTasks.length
    };
  }
};

// Debounced search function
export const createDebouncedSearch = (callback: (search: string) => void, delay: number = 300) => {
  let timeoutId: NodeJS.Timeout;
  
  return (search: string) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(search), delay);
  };
};

// Task list performance metrics
export interface TaskListMetrics {
  totalTasks: number;
  filteredTasks: number;
  activeTasks: number;
  completedTasks: number;
  renderTime: number;
  filterTime: number;
  sortTime: number;
}

export const measureTaskListPerformance = (fn: () => ProcessedTasks): [ProcessedTasks, TaskListMetrics] => {
  const startTime = performance.now();
  
  const filterStartTime = performance.now();
  const result = fn();
  const filterEndTime = performance.now();
  
  const endTime = performance.now();
  
  const metrics: TaskListMetrics = {
    totalTasks: result.totalCount,
    filteredTasks: result.filteredCount,
    activeTasks: result.activeTasks.length,
    completedTasks: result.completedTasks.length,
    renderTime: endTime - startTime,
    filterTime: filterEndTime - filterStartTime,
    sortTime: 0 // Would need more granular measurement
  };
  
  return [result, metrics];
};

// Batch operations optimization
export interface BatchOperation<T> {
  operation: (item: T) => Promise<void>;
  items: T[];
  batchSize?: number;
  delayBetweenBatches?: number;
}

export const executeBatchOperation = async <T>({
  operation,
  items,
  batchSize = 10,
  delayBetweenBatches = 100
}: BatchOperation<T>): Promise<void> => {
  const batches = [];
  
  // Split items into batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  
  // Execute batches with delay
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    // Execute all operations in the current batch concurrently
    await Promise.all(batch.map(item => operation(item)));
    
    // Add delay between batches (except for the last one)
    if (i < batches.length - 1 && delayBetweenBatches > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
};

// Task list virtualization helpers
export const calculateOptimalItemHeight = (
  containerHeight: number,
  itemCount: number,
  minItemHeight: number = 60,
  maxItemHeight: number = 120
): number => {
  const calculatedHeight = Math.floor(containerHeight / Math.min(itemCount, 10));
  return Math.max(minItemHeight, Math.min(maxItemHeight, calculatedHeight));
};

export const calculateOptimalContainerHeight = (
  availableHeight: number,
  itemCount: number,
  itemHeight: number,
  maxVisibleItems: number = 20
): number => {
  const idealHeight = Math.min(itemCount, maxVisibleItems) * itemHeight;
  return Math.min(idealHeight, availableHeight * 0.7); // Use max 70% of available height
};