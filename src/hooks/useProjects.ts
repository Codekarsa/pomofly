import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from '../lib/firebase';
import {
  getGuestProjects,
  addGuestProject,
  updateGuestProject,
  deleteGuestProject,
} from '../lib/guestStorage';
import { 
  transformFirebaseProject, 
  validateProjectCreate, 
  validateProjectUpdate,
  type Project
} from '../lib/validation';

// Project interface now imported from validation.ts

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      // Guest mode: use localStorage
      setIsGuest(true);
      const guestProjects = getGuestProjects();
      setProjects(guestProjects);
      setLoading(false);
      setError(null);
      return;
    }

    setIsGuest(false);
    const projectsQuery = query(collection(db, "projects"), where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(
      projectsQuery,
      (querySnapshot) => {
        const projectList: Project[] = [];
        querySnapshot.forEach((doc) => {
          try {
            const validatedProject = transformFirebaseProject({ id: doc.id, ...doc.data() });
            projectList.push(validatedProject);
          } catch (validationError) {
            console.error(`Invalid project data for document ${doc.id}:`, validationError);
            // Skip invalid projects but continue processing others
          }
        });
        setProjects(projectList);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching projects:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const refreshGuestProjects = useCallback(() => {
    if (isGuest) {
      const guestProjects = getGuestProjects();
      setProjects(guestProjects);
    }
  }, [isGuest]);

  const addProject = useCallback(async (name: string) => {
    const user = auth.currentUser;

    if (!user) {
      // Guest mode
      const newProject = addGuestProject(name);
      setProjects(prev => [...prev, newProject]);
      return newProject.id;
    }

    try {
      const validatedProject = validateProjectCreate({
        name,
        userId: user.uid,
      });
      
      const projectData = {
        ...validatedProject,
        createdAt: new Date()
      };
      
      const docRef = await addDoc(collection(db, "projects"), projectData);
      return docRef.id;
    } catch (err) {
      console.error("Error adding project:", err);
      throw err;
    }
  }, []);

  const updateProject = useCallback(async (id: string, name: string) => {
    const user = auth.currentUser;

    try {
      // Validate the update data
      const validatedUpdate = validateProjectUpdate({ id, name });
      // Remove the id from updates since we don't want to update the document ID
      const { id: _id, ...updateData } = validatedUpdate;

      if (!user) {
        // Guest mode
        updateGuestProject(id, updateData.name!);
        setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updateData } : p));
        return;
      }

      await updateDoc(doc(db, "projects", id), updateData);
    } catch (err) {
      console.error("Error updating project:", err);
      throw err;
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    const user = auth.currentUser;

    if (!user) {
      // Guest mode
      deleteGuestProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      return;
    }

    try {
      await deleteDoc(doc(db, "projects", id));
    } catch (err) {
      console.error("Error deleting project:", err);
      throw err;
    }
  }, []);

  return {
    projects,
    loading,
    error,
    isGuest,
    addProject,
    updateProject,
    deleteProject,
    refreshGuestProjects
  };
}
