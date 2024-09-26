'use client'

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import { db, auth } from '../lib/firebase';

interface Task {
  id: string;
  title: string;
  projectId: string;
  completed: boolean;
  totalPomodoroSessions: number;
  totalTimeSpent: number;
}

interface Project {
  id: string;
  name: string;
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      // Fetch tasks
      const tasksQuery = query(collection(db, "tasks"), where("userId", "==", user.uid));
      const unsubscribeTasks = onSnapshot(tasksQuery, (querySnapshot) => {
        const taskList: Task[] = [];
        querySnapshot.forEach((doc) => {
          taskList.push({ id: doc.id, ...doc.data() } as Task);
        });
        setTasks(taskList);
      });

      // Fetch projects
      const projectsQuery = query(collection(db, "projects"), where("userId", "==", user.uid));
      const unsubscribeProjects = onSnapshot(projectsQuery, (querySnapshot) => {
        const projectList: Project[] = [];
        querySnapshot.forEach((doc) => {
          projectList.push({ id: doc.id, ...doc.data() } as Project);
        });
        setProjects(projectList);
      });

      return () => {
        unsubscribeTasks();
        unsubscribeProjects();
      };
    }
  }, []);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim() && selectedProjectId && auth.currentUser) {
      await addDoc(collection(db, "tasks"), {
        title: newTaskTitle,
        projectId: selectedProjectId,
        completed: false,
        userId: auth.currentUser.uid,
        totalPomodoroSessions: 0,
        totalTimeSpent: 0,
        createdAt: new Date(),
      });
      setNewTaskTitle('');
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    await updateDoc(doc(db, "tasks", taskId), {
      completed: !completed,
    });
  };

  return (
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="text-2xl font-bold mb-4">Your Tasks</h2>
      <form onSubmit={addTask} className="mb-4">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="New task title"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2"
        />
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2"
        >
          <option value="">Select a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
          Add Task
        </button>
      </form>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} className="mb-2 flex items-center">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => toggleTask(task.id, task.completed)}
              className="mr-2"
            />
            <span className={task.completed ? 'line-through' : ''}>{task.title}</span>
            <span className="ml-2 text-sm text-gray-500">
              ({task.totalPomodoroSessions} sessions, {task.totalTimeSpent} minutes)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}