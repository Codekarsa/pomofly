import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from '../lib/firebase';

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

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      setError(new Error('User not authenticated'));
      return;
    }

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

  const addProject = useCallback(async (name: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

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
    try {
      await updateDoc(doc(db, "projects", id), { name });
    } catch (err) {
      console.error("Error updating project:", err);
      throw err;
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, "projects", id));
    } catch (err) {
      console.error("Error deleting project:", err);
      throw err;
    }
  }, []);

  return { projects, loading, error, addProject, updateProject, deleteProject };
}