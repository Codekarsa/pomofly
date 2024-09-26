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
    <div className="bg-[#f2f2f2] shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="text-2xl font-bold mb-4 text-[#1A1A1A]">Your Tasks</h2>
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="New task title"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-[#1A1A1A] leading-tight focus:outline-none focus:shadow-outline mb-2"
        />
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-[#1A1A1A] leading-tight focus:outline-none focus:shadow-outline mb-2"
        >
          <option value="">Select a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <button type="submit" className="bg-[#333333] hover:bg-[#1A1A1A] text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
          Add Task
        </button>
      </form>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} className="mb-2 flex items-center justify-between">
            {editingTask && editingTask.id === task.id ? (
              <form onSubmit={handleUpdateTask} className="flex-grow mr-2">
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-[#1A1A1A] leading-tight focus:outline-none focus:shadow-outline"
                />
                <button type="submit" className="mt-2 bg-[#333333] hover:bg-[#1A1A1A] text-white font-bold py-1 px-2 rounded text-xs mr-2">
                  Save
                </button>
                <button type="button" onClick={() => setEditingTask(null)} className="mt-2 bg-[#666666] hover:bg-[#333333] text-white font-bold py-1 px-2 rounded text-xs">
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTaskCompletion(task.id, task.completed)}
                    className="mr-2"
                  />
                  <span className={`${task.completed ? 'line-through' : ''} text-[#1A1A1A]`}>{task.title}</span>
                </div>
                <div>
                  <span className="mr-2 text-sm text-[#333333]">
                    ({task.totalPomodoroSessions} sessions, {task.totalTimeSpent} minutes)
                  </span>
                  <button 
                    onClick={() => setEditingTask({ id: task.id, title: task.title })}
                    className="bg-[#666666] hover:bg-[#333333] text-white font-bold py-1 px-2 rounded text-xs mr-2"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="bg-[#333333] hover:bg-[#1A1A1A] text-white font-bold py-1 px-2 rounded text-xs"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}