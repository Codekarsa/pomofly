import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from '../lib/firebase';
import {
  getGuestProjects,
  addGuestProject,
  updateGuestProject,
  deleteGuestProject,
} from '../lib/guestStorage';

export interface Project {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
}

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
          projectList.push({ id: doc.id, ...doc.data() } as Project);
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
      const newProject = {
        name,
        userId: user.uid,
        createdAt: new Date()
      };
      const docRef = await addDoc(collection(db, "projects"), newProject);
      return docRef.id;
    } catch (err) {
      console.error("Error adding project:", err);
      throw err;
    }
  }, []);

  const updateProject = useCallback(async (id: string, name: string) => {
    const user = auth.currentUser;

    if (!user) {
      // Guest mode
      updateGuestProject(id, name);
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
      return;
    }

    try {
      await updateDoc(doc(db, "projects", id), { name });
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
