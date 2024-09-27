import React, { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';

export default function TaskList() {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [editingTask, setEditingTask] = useState<{ id: string, title: string } | null>(null);
  const [showCompleted, setShowCompleted] = useState(false); // State for showing completed tasks

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
      }
    }
  };

  if (tasksLoading) return <div>Loading tasks...</div>;
  if (tasksError) return <div>Error loading tasks: {tasksError.message}</div>;

  const filteredTasks = tasks.filter(task => showCompleted || !task.completed); // Filter based on showCompleted

  return (
    <div className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4 transition-all duration-300 hover:shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-[#1A1A1A] border-b pb-2">Your Tasks</h2>
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="New task title"
            className="flex-grow shadow-sm border-gray-300 rounded-md py-2 px-3 text-[#1A1A1A] focus:ring-2 focus:ring-[#333333] focus:border-[#333333]"
          />
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="shadow-sm border-gray-300 rounded-md py-2 px-3 text-[#1A1A1A] focus:ring-2 focus:ring-[#333333] focus:border-[#333333]"
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <button type="submit" className="bg-[#333333] hover:bg-[#1A1A1A] text-white font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out transform hover:scale-105">
            Add Task
          </button>
        </div>
      </form>
      <div className="flex items-center mb-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={() => setShowCompleted(!showCompleted)} // Toggle completed tasks visibility
            className="hidden" // Hide the default checkbox
            id="showCompleted"
          />
          <label 
            htmlFor="showCompleted" 
            className="flex items-center cursor-pointer text-[#1A1A1A] transition duration-200 ease-in-out"
          >
            <span className={`w-5 h-5 flex items-center justify-center border-2 rounded-md ${showCompleted ? 'bg-[#333333] text-white' : 'bg-white'} transition duration-200 ease-in-out`}>
              {showCompleted && <span className="text-xs">✔️</span>} {/* Checkmark for checked state */}
            </span>
            <span className="ml-2">Show completed tasks</span>
          </label>
        </div>
      </div>
      <ul className="space-y-3">
        {filteredTasks.map((task) => (
          <li key={task.id} className={`rounded-md p-4 shadow-sm transition-all duration-200 hover:shadow-md ${task.completed ? 'bg-[#e0f7fa]' : 'bg-[#f2f2f2]'}`}>
            {editingTask && editingTask.id === task.id ? (
              <form onSubmit={handleUpdateTask} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="flex-grow shadow-sm border-gray-300 rounded-md py-1 px-2 text-[#1A1A1A] focus:ring-2 focus:ring-[#333333] focus:border-[#333333]"
                />
                <button type="submit" className="bg-[#333333] hover:bg-[#1A1A1A] text-white font-bold py-1 px-2 rounded-md text-sm transition duration-150 ease-in-out">
                  Save
                </button>
                <button type="button" onClick={() => setEditingTask(null)} className="bg-[#666666] hover:bg-[#333333] text-white font-bold py-1 px-2 rounded-md text-sm transition duration-150 ease-in-out">
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
                    className="h-5 w-5 text-[#333333] focus:ring-[#333333] border-gray-300 rounded"
                  />
                  <span className={`${task.completed ? 'line-through text-[#666666]' : 'text-[#1A1A1A]'} text-lg`}>
                    {task.title}
                    {task.completed && <span className="ml-2 text-green-500">✔️</span>} {/* Checkmark for completed tasks */}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-[#666666]">
                    {task.totalPomodoroSessions} sessions, {task.totalTimeSpent} minutes
                  </span>
                  <button 
                    onClick={() => setEditingTask({ id: task.id, title: task.title })}
                    className="text-[#333333] hover:text-[#1A1A1A] font-medium text-sm"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="text-[#333333] hover:text-[#1A1A1A] font-medium text-sm"
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