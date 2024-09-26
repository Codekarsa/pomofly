'use client'

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc } from "firebase/firestore";
import { db, auth } from '../lib/firebase';

interface Project {
  id: string;
  name: string;
}

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const q = query(collection(db, "projects"), where("userId", "==", user.uid));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const projectList: Project[] = [];
        querySnapshot.forEach((doc) => {
          projectList.push({ id: doc.id, ...doc.data() } as Project);
        });
        setProjects(projectList);
      });
      return () => unsubscribe();
    }
  }, []);

  const addProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim() && auth.currentUser) {
      await addDoc(collection(db, "projects"), {
        name: newProjectName,
        userId: auth.currentUser.uid,
      });
      setNewProjectName('');
    }
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="text-2xl font-bold mb-4">Your Projects</h2>
      <form onSubmit={addProject} className="mb-4">
        <input
          type="text"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="New project name"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
        <button type="submit" className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
          Add Project
        </button>
      </form>
      <ul>
        {projects.map((project) => (
          <li key={project.id} className="mb-2">
            {project.name}
          </li>
        ))}
      </ul>
    </div>
  );
}