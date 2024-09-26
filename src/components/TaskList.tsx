import React, { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';

export default function TaskList() {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [editingTask, setEditingTask] = useState<{ id: string, title: string } | null>(null);
  
  const { projects } = useProjects();
  const { 
    tasks, 
    loading: tasksLoading, 
    error: tasksError, 
    addTask, 
    updateTask,
    toggleTaskCompletion, 
    deleteTask 
  } = useTasks(selectedProjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim() && selectedProjectId) {
      try {
        await addTask(newTaskTitle, selectedProjectId);
        setNewTaskTitle('');
      } catch (error) {
        console.error("Failed to add task:", error);
        // You might want to show an error message to the user here
      }
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask && editingTask.title.trim()) {
      try {
        await updateTask(editingTask.id, { title: editingTask.title });
        setEditingTask(null);
      } catch (error) {
        console.error("Failed to update task:", error);
        // You might want to show an error message to the user here
      }
    }
  };

  if (tasksLoading) return <div>Loading tasks...</div>;
  if (tasksError) return <div>Error loading tasks: {tasksError.message}</div>;

  return (
    <div className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4 transition-all duration-300 hover:shadow-xl">
      <h2 className="text-3xl font-bold mb-6 text-[#1A1A1A] border-b pb-2">Your Tasks</h2>
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="New task title"
            className="flex-grow shadow-sm border-gray-300 rounded-md py-2 px-3 text-[#1A1A1A] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="shadow-sm border-gray-300 rounded-md py-2 px-3 text-[#1A1A1A] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out transform hover:scale-105">
            Add Task
          </button>
        </div>
      </form>
      <ul className="space-y-3">
        {tasks.map((task) => (
          <li key={task.id} className="bg-gray-50 rounded-md p-4 shadow-sm transition-all duration-200 hover:shadow-md">
            {editingTask && editingTask.id === task.id ? (
              <form onSubmit={handleUpdateTask} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="flex-grow shadow-sm border-gray-300 rounded-md py-1 px-2 text-[#1A1A1A] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button type="submit" className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded-md text-sm transition duration-150 ease-in-out">
                  Save
                </button>
                <button type="button" onClick={() => setEditingTask(null)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-1 px-2 rounded-md text-sm transition duration-150 ease-in-out">
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTaskCompletion(task.id, task.completed)}
                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className={`${task.completed ? 'line-through text-gray-500' : 'text-[#1A1A1A]'} text-lg`}>{task.title}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    {task.totalPomodoroSessions} sessions, {task.totalTimeSpent} minutes
                  </span>
                  <button 
                    onClick={() => setEditingTask({ id: task.id, title: task.title })}
                    className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}