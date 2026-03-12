import {
  Firestore,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { IProjectService, Project, CreateProjectData, ProjectUpdate } from '../interfaces/IProjectService';
import { IAuthService } from '../interfaces/IAuthService';

export class FirebaseProjectService implements IProjectService {
  private readonly collectionName = 'projects';

  constructor(
    private db: Firestore,
    private authService: IAuthService
  ) {}

  private validateAuthentication(): string {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return userId;
  }

  private mapFirestoreProject(doc: QueryDocumentSnapshot | DocumentSnapshot): Project {
    const data = doc.data();
    if (!data) {
      throw new Error('Document data is missing');
    }
    return {
      id: doc.id,
      name: data.name,
      userId: data.userId,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  }

  async getProjects(): Promise<Project[]> {
    try {
      const userId = this.validateAuthentication();
      const projectsQuery = query(
        collection(this.db, this.collectionName), 
        where("userId", "==", userId)
      );
      
      const querySnapshot = await getDocs(projectsQuery);
      const projects: Project[] = [];
      querySnapshot.forEach((doc) => {
        projects.push(this.mapFirestoreProject(doc));
      });
      return projects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw new Error('Failed to fetch projects');
    }
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      this.validateAuthentication();
      const docRef = doc(this.db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const project = this.mapFirestoreProject(docSnap);
        // Verify ownership
        if (project.userId !== this.authService.getCurrentUserId()) {
          throw new Error('Unauthorized access to project');
        }
        return project;
      }
      return null;
    } catch (error) {
      console.error('Error fetching project:', error);
      throw new Error('Failed to fetch project');
    }
  }

  async createProject(data: CreateProjectData): Promise<string> {
    try {
      const userId = this.validateAuthentication();
      
      const projectData = {
        name: data.name,
        userId,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(this.db, this.collectionName), projectData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating project:', error);
      throw new Error('Failed to create project');
    }
  }

  async updateProject(id: string, updates: ProjectUpdate): Promise<void> {
    try {
      // Verify ownership first
      const existingProject = await this.getProject(id);
      if (!existingProject) {
        throw new Error('Project not found');
      }

      const docRef = doc(this.db, this.collectionName, id);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating project:', error);
      throw new Error('Failed to update project');
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      // Verify ownership first
      const existingProject = await this.getProject(id);
      if (!existingProject) {
        throw new Error('Project not found');
      }

      const docRef = doc(this.db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting project:', error);
      throw new Error('Failed to delete project');
    }
  }

  subscribeProjects(
    callback: (projects: Project[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    try {
      const userId = this.validateAuthentication();
      const projectsQuery = query(
        collection(this.db, this.collectionName), 
        where("userId", "==", userId)
      );
      
      return onSnapshot(
        projectsQuery,
        (querySnapshot) => {
          const projects: Project[] = [];
          querySnapshot.forEach((doc) => {
            projects.push(this.mapFirestoreProject(doc));
          });
          callback(projects);
        },
        (error) => {
          console.error('Error in project subscription:', error);
          const errorObj = new Error('Project subscription failed');
          if (onError) {
            onError(errorObj);
          }
        }
      );
    } catch (error) {
      console.error('Error setting up project subscription:', error);
      throw new Error('Failed to setup project subscription');
    }
  }

  async getProjectTasks(projectId: string): Promise<Record<string, unknown>[]> {
    try {
      const userId = this.validateAuthentication();
      
      // First verify the project exists and belongs to user
      const project = await this.getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const tasksQuery = query(
        collection(this.db, 'tasks'),
        where("userId", "==", userId),
        where("projectId", "==", projectId)
      );
      
      const querySnapshot = await getDocs(tasksQuery);
      const tasks: Record<string, unknown>[] = [];
      querySnapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() });
      });
      return tasks;
    } catch (error) {
      console.error('Error fetching project tasks:', error);
      throw new Error('Failed to fetch project tasks');
    }
  }
}