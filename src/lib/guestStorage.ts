import { Task } from '@/hooks/useTasks';
import { Project } from '@/hooks/useProjects';
import { storageManager } from '@/lib/storageManager';

const GUEST_TASKS_KEY = 'pomofly_guest_tasks';
const GUEST_PROJECTS_KEY = 'pomofly_guest_projects';

// Helper to generate unique IDs for guest data
export function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Helper to safely parse and validate data
function safeParseData<T>(data: string | null, fallback: T): T {
  if (!data) return fallback;
  
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return fallback;
    return parsed;
  } catch (error) {
    console.warn('Failed to parse storage data:', error);
    return fallback;
  }
}

// Tasks
export function getGuestTasks(): Task[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = storageManager.getItem(GUEST_TASKS_KEY);
    const tasks = safeParseData<Task[]>(data, []);
    
    // Transform date strings back to Date objects and validate structure
    return tasks.filter((task): task is Task => {
      return (
        task &&
        typeof task === 'object' &&
        'id' in task &&
        'title' in task &&
        'createdAt' in task
      );
    }).map((task: Task) => ({
      ...task,
      createdAt: new Date(task.createdAt),
      trackingStartedAt: task.trackingStartedAt ? new Date(task.trackingStartedAt) : null,
    }));
  } catch (error) {
    console.warn('Failed to load guest tasks:', error);
    return [];
  }
}

export async function saveGuestTasks(tasks: Task[]): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  try {
    // Validate tasks before saving
    const validTasks = tasks.filter(task => 
      task && 
      task.id && 
      task.title && 
      task.createdAt
    );
    
    if (validTasks.length !== tasks.length) {
      console.warn(`Filtered out ${tasks.length - validTasks.length} invalid tasks`);
    }
    
    const success = await storageManager.setItem(GUEST_TASKS_KEY, JSON.stringify(validTasks));
    return success;
  } catch (error) {
    console.error('Error saving guest tasks:', error);
    return false;
  }
}

export async function addGuestTask(task: Omit<Task, 'id'>): Promise<Task | null> {
  const tasks = getGuestTasks();
  const newTask: Task = {
    ...task,
    id: generateGuestId(),
  };
  
  tasks.push(newTask);
  const success = await saveGuestTasks(tasks);
  
  if (!success) {
    console.error('Failed to save new task');
    return null;
  }
  
  return newTask;
}

export async function updateGuestTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
  const tasks = getGuestTasks();
  const index = tasks.findIndex(t => t.id === taskId);
  
  if (index === -1) {
    console.warn(`Task with id ${taskId} not found`);
    return false;
  }
  
  tasks[index] = { ...tasks[index], ...updates };
  return await saveGuestTasks(tasks);
}

export async function deleteGuestTask(taskId: string): Promise<boolean> {
  const tasks = getGuestTasks();
  const filtered = tasks.filter(t => t.id !== taskId);
  
  if (filtered.length === tasks.length) {
    console.warn(`Task with id ${taskId} not found`);
    return false;
  }
  
  return await saveGuestTasks(filtered);
}

// Projects
export function getGuestProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = storageManager.getItem(GUEST_PROJECTS_KEY);
    const projects = safeParseData<Project[]>(data, []);
    
    // Transform date strings back to Date objects and validate structure
    return projects.filter((project): project is Project => {
      return (
        project &&
        typeof project === 'object' &&
        'id' in project &&
        'name' in project &&
        'createdAt' in project
      );
    }).map((project: Project) => ({
      ...project,
      createdAt: new Date(project.createdAt),
    }));
  } catch (error) {
    console.warn('Failed to load guest projects:', error);
    return [];
  }
}

export async function saveGuestProjects(projects: Project[]): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  try {
    // Validate projects before saving
    const validProjects = projects.filter(project => 
      project && 
      project.id && 
      project.name && 
      project.createdAt
    );
    
    if (validProjects.length !== projects.length) {
      console.warn(`Filtered out ${projects.length - validProjects.length} invalid projects`);
    }
    
    const success = await storageManager.setItem(GUEST_PROJECTS_KEY, JSON.stringify(validProjects));
    return success;
  } catch (error) {
    console.error('Error saving guest projects:', error);
    return false;
  }
}

export async function addGuestProject(name: string): Promise<Project | null> {
  const projects = getGuestProjects();
  const newProject: Project = {
    id: generateGuestId(),
    name,
    userId: 'guest',
    createdAt: new Date(),
  };
  
  projects.push(newProject);
  const success = await saveGuestProjects(projects);
  
  if (!success) {
    console.error('Failed to save new project');
    return null;
  }
  
  return newProject;
}

export async function updateGuestProject(projectId: string, name: string): Promise<boolean> {
  const projects = getGuestProjects();
  const index = projects.findIndex(p => p.id === projectId);
  
  if (index === -1) {
    console.warn(`Project with id ${projectId} not found`);
    return false;
  }
  
  projects[index] = { ...projects[index], name };
  return await saveGuestProjects(projects);
}

export async function deleteGuestProject(projectId: string): Promise<boolean> {
  const projects = getGuestProjects();
  const filtered = projects.filter(p => p.id !== projectId);
  
  if (filtered.length === projects.length) {
    console.warn(`Project with id ${projectId} not found`);
    return false;
  }
  
  return await saveGuestProjects(filtered);
}

// Data migration helpers
export function hasGuestData(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const tasks = getGuestTasks();
    const projects = getGuestProjects();
    return tasks.length > 0 || projects.length > 0;
  } catch (error) {
    console.warn('Error checking for guest data:', error);
    return false;
  }
}

export async function clearGuestData(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  try {
    const tasksRemoved = storageManager.removeItem(GUEST_TASKS_KEY);
    const projectsRemoved = storageManager.removeItem(GUEST_PROJECTS_KEY);
    return tasksRemoved && projectsRemoved;
  } catch (error) {
    console.error('Error clearing guest data:', error);
    return false;
  }
}

export function getGuestDataSummary(): { taskCount: number; projectCount: number; hasStorageIssues: boolean } {
  try {
    const tasks = getGuestTasks();
    const projects = getGuestProjects();
    const hasStorageIssues = storageManager.isUsingFallback();
    
    return {
      taskCount: tasks.length,
      projectCount: projects.length,
      hasStorageIssues,
    };
  } catch (error) {
    console.warn('Error getting guest data summary:', error);
    return {
      taskCount: 0,
      projectCount: 0,
      hasStorageIssues: true,
    };
  }
}

// Storage health utilities
export async function getStorageHealth(): Promise<{
  isHealthy: boolean;
  issues: string[];
  recommendation: string | null;
}> {
  const issues: string[] = [];
  let recommendation: string | null = null;

  try {
    const storageInfo = await storageManager.getStorageInfo();
    
    if (!storageInfo.available) {
      issues.push('Browser storage is not available');
      recommendation = 'Sign in to save your data to the cloud';
    } else {
      const usageRatio = storageInfo.usage / storageInfo.quota;
      
      if (usageRatio > 0.9) {
        issues.push(`Storage is ${Math.round(usageRatio * 100)}% full`);
        recommendation = 'Sign in to sync data to cloud or clear old data';
      } else if (usageRatio > 0.8) {
        issues.push(`Storage is getting full (${Math.round(usageRatio * 100)}%)`);
        recommendation = 'Consider signing in to sync data to cloud';
      }
    }
    
    if (storageManager.isUsingFallback()) {
      issues.push('Using temporary in-memory storage');
      if (!recommendation) {
        recommendation = 'Sign in to permanently save your data';
      }
    }
    
    return {
      isHealthy: issues.length === 0,
      issues,
      recommendation,
    };
  } catch (error) {
    console.error('Error checking storage health:', error);
    return {
      isHealthy: false,
      issues: ['Unable to check storage health'],
      recommendation: 'Try refreshing the page or sign in',
    };
  }
}
