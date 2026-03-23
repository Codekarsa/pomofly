import { Task } from '@/hooks/useTasks';
import { Project } from '@/hooks/useProjects';
import { Label } from '@/hooks/useLabels';

const GUEST_TASKS_KEY = 'pomofly_guest_tasks';
const GUEST_PROJECTS_KEY = 'pomofly_guest_projects';
const GUEST_LABELS_KEY = 'pomofly_guest_labels';

// Helper to generate unique IDs for guest data
export function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Tasks
export function getGuestTasks(): Task[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(GUEST_TASKS_KEY);
    if (!data) return [];
    const tasks = JSON.parse(data);
    return tasks.map((task: Task) => ({
      ...task,
      createdAt: new Date(task.createdAt),
      trackingStartedAt: task.trackingStartedAt
        ? new Date(task.trackingStartedAt)
        : null,
    }));
  } catch {
    return [];
  }
}

export function saveGuestTasks(tasks: Task[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_TASKS_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Error saving guest tasks:', error);
  }
}

export function addGuestTask(task: Omit<Task, 'id'>): Task {
  const tasks = getGuestTasks();
  const newTask: Task = {
    ...task,
    id: generateGuestId(),
  };
  tasks.push(newTask);
  saveGuestTasks(tasks);
  return newTask;
}

export function updateGuestTask(taskId: string, updates: Partial<Task>): void {
  const tasks = getGuestTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updates };
    saveGuestTasks(tasks);
  }
}

export function deleteGuestTask(taskId: string): void {
  const tasks = getGuestTasks();
  const filtered = tasks.filter((t) => t.id !== taskId);
  saveGuestTasks(filtered);
}

// Projects
export function getGuestProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(GUEST_PROJECTS_KEY);
    if (!data) return [];
    const projects = JSON.parse(data);
    return projects.map((project: Project) => ({
      ...project,
      createdAt: new Date(project.createdAt),
    }));
  } catch {
    return [];
  }
}

export function saveGuestProjects(projects: Project[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_PROJECTS_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Error saving guest projects:', error);
  }
}

export function addGuestProject(name: string): Project {
  const projects = getGuestProjects();
  const newProject: Project = {
    id: generateGuestId(),
    name,
    userId: 'guest',
    createdAt: new Date(),
  };
  projects.push(newProject);
  saveGuestProjects(projects);
  return newProject;
}

export function updateGuestProject(projectId: string, name: string): void {
  const projects = getGuestProjects();
  const index = projects.findIndex((p) => p.id === projectId);
  if (index !== -1) {
    projects[index] = { ...projects[index], name };
    saveGuestProjects(projects);
  }
}

export function deleteGuestProject(projectId: string): void {
  const projects = getGuestProjects();
  const filtered = projects.filter((p) => p.id !== projectId);
  saveGuestProjects(filtered);
}

// Labels
export function getGuestLabels(): Label[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(GUEST_LABELS_KEY);
    if (!data) return [];
    const labels = JSON.parse(data);
    return labels.map((label: Label) => ({
      ...label,
      createdAt: new Date(label.createdAt),
    }));
  } catch {
    return [];
  }
}

export function saveGuestLabels(labels: Label[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_LABELS_KEY, JSON.stringify(labels));
  } catch (error) {
    console.error('Error saving guest labels:', error);
  }
}

export function addGuestLabel(name: string, color: string): Label {
  const labels = getGuestLabels();
  const newLabel: Label = {
    id: generateGuestId(),
    name,
    color,
    userId: 'guest',
    createdAt: new Date(),
  };
  labels.push(newLabel);
  saveGuestLabels(labels);
  return newLabel;
}

export function updateGuestLabel(
  labelId: string,
  updates: { name?: string; color?: string }
): void {
  const labels = getGuestLabels();
  const index = labels.findIndex((l) => l.id === labelId);
  if (index !== -1) {
    labels[index] = { ...labels[index], ...updates };
    saveGuestLabels(labels);
  }
}

export function deleteGuestLabel(labelId: string): void {
  const labels = getGuestLabels();
  const filtered = labels.filter((l) => l.id !== labelId);
  saveGuestLabels(filtered);
}

// Data migration helpers
export function hasGuestData(): boolean {
  if (typeof window === 'undefined') return false;
  const tasks = getGuestTasks();
  const projects = getGuestProjects();
  return tasks.length > 0 || projects.length > 0;
}

export function clearGuestData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_TASKS_KEY);
  localStorage.removeItem(GUEST_PROJECTS_KEY);
}

export function getGuestDataSummary(): {
  taskCount: number;
  projectCount: number;
} {
  const tasks = getGuestTasks();
  const projects = getGuestProjects();
  return {
    taskCount: tasks.length,
    projectCount: projects.length,
  };
}
