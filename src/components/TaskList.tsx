'use client'

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import { db, auth } from '../lib/firebase';

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const taskList: Task[] = [];
        querySnapshot.forEach((doc) => {
          taskList.push({ id: doc.id, ...doc.data() } as Task);
        });
        setTasks(taskList);
      });
      return () => unsubscribe();
    }
  }, []);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim() && auth.currentUser) {
      await addDoc(collection(db, "tasks"), {
        title: newTaskTitle,
        completed: false,
        userId: auth.currentUser.uid,
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
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
        <button type="submit" className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
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
          </li>
        ))}
      </ul>
    </div>
  );
}