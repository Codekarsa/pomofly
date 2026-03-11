'use client'

import React, { createContext, useContext, useMemo } from 'react';
import { auth, db, googleProvider } from '@/lib/firebase';
import { IAuthService } from './interfaces/IAuthService';
import { ITaskService } from './interfaces/ITaskService';
import { IProjectService } from './interfaces/IProjectService';
import { FirebaseAuthService } from './implementations/FirebaseAuthService';
import { FirebaseTaskService } from './implementations/FirebaseTaskService';
import { FirebaseProjectService } from './implementations/FirebaseProjectService';

interface ServiceContextType {
  authService: IAuthService;
  taskService: ITaskService;
  projectService: IProjectService;
}

const ServiceContext = createContext<ServiceContextType | null>(null);

export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const services = useMemo(() => {
    // Create auth service first since other services depend on it
    const authService = new FirebaseAuthService(auth, googleProvider);
    
    // Create other services with auth service dependency
    const taskService = new FirebaseTaskService(db, authService);
    const projectService = new FirebaseProjectService(db, authService);

    return {
      authService,
      taskService,
      projectService,
    };
  }, []);

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
};

// Custom hook to access services
export const useServices = (): ServiceContextType => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
};

// Individual service hooks for convenience
export const useAuthService = (): IAuthService => {
  const { authService } = useServices();
  return authService;
};

export const useTaskService = (): ITaskService => {
  const { taskService } = useServices();
  return taskService;
};

export const useProjectService = (): IProjectService => {
  const { projectService } = useServices();
  return projectService;
};