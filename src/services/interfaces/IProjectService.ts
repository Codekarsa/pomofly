export interface Project {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
}

export interface CreateProjectData {
  name: string;
}

export interface ProjectUpdate {
  name?: string;
}

export interface IProjectService {
  // CRUD operations
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  createProject(data: CreateProjectData): Promise<string>;
  updateProject(id: string, updates: ProjectUpdate): Promise<void>;
  deleteProject(id: string): Promise<void>;
  
  // Real-time subscriptions
  subscribeProjects(
    callback: (projects: Project[]) => void,
    onError?: (error: Error) => void
  ): () => void;
  
  // Project-specific operations
  getProjectTasks(projectId: string): Promise<Record<string, unknown>[]>; // Returns Task[] but avoiding circular dep
}