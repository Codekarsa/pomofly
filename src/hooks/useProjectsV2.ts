import { useState, useEffect, useCallback } from 'react';
import { useProjectService } from '@/services/ServiceProvider';
import { Project, CreateProjectData, ProjectUpdate } from '@/services/interfaces/IProjectService';

export interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  error: Error | null;
  
  // CRUD operations
  createProject: (data: CreateProjectData) => Promise<string | void>;
  updateProject: (id: string, updates: ProjectUpdate) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  
  // Project-specific operations
  getProjectTasks: (projectId: string) => Promise<any[]>;
  
  // Utility
  refreshProjects: () => Promise<void>;
}

export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const projectService = useProjectService();

  // Set up real-time subscription
  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = projectService.subscribeProjects(
      (projects) => {
        setProjects(projects);
        setLoading(false);
      },
      (error) => {
        console.error('Project subscription error:', error);
        setError(error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [projectService]);

  // CRUD operations
  const createProject = useCallback(async (data: CreateProjectData) => {
    try {
      setError(null);
      const projectId = await projectService.createProject(data);
      return projectId;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to create project');
      setError(errorObj);
      console.error('Create project error:', error);
      throw errorObj;
    }
  }, [projectService]);

  const updateProject = useCallback(async (id: string, updates: ProjectUpdate) => {
    try {
      setError(null);
      await projectService.updateProject(id, updates);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to update project');
      setError(errorObj);
      console.error('Update project error:', error);
      throw errorObj;
    }
  }, [projectService]);

  const deleteProject = useCallback(async (id: string) => {
    try {
      setError(null);
      await projectService.deleteProject(id);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to delete project');
      setError(errorObj);
      console.error('Delete project error:', error);
      throw errorObj;
    }
  }, [projectService]);

  // Project-specific operations
  const getProjectTasks = useCallback(async (projectId: string) => {
    try {
      setError(null);
      return await projectService.getProjectTasks(projectId);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to get project tasks');
      setError(errorObj);
      console.error('Get project tasks error:', error);
      throw errorObj;
    }
  }, [projectService]);

  // Manual refresh
  const refreshProjects = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const refreshedProjects = await projectService.getProjects();
      setProjects(refreshedProjects);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to refresh projects');
      setError(errorObj);
      console.error('Refresh projects error:', error);
    } finally {
      setLoading(false);
    }
  }, [projectService]);

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    getProjectTasks,
    refreshProjects,
  };
}

// Export the Project type for convenience
export type { Project, CreateProjectData, ProjectUpdate } from '@/services/interfaces/IProjectService';