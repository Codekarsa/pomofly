import React, { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';

export default function TaskList() {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [estimatedPomodoros, setEstimatedPomodoros] = useState<number | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [editingTask, setEditingTask] = useState<{ id: string, title: string, estimatedPomodoros?: number } | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [visibleOptions, setVisibleOptions] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownActive, setIsDropdownActive] = useState(false);

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
        await addTask(newTaskTitle, selectedProjectId, estimatedPomodoros);
        setNewTaskTitle('');
        setEstimatedPomodoros(undefined);
      } catch (error) {
        console.error("Failed to add task:", error);
      }
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask && editingTask.title.trim()) {
      try {
        await updateTask(editingTask.id, { title: editingTask.title, estimatedPomodoros: editingTask.estimatedPomodoros });
        setEditingTask(null);
        setEstimatedPomodoros(undefined);
      } catch (error) {
        console.error("Failed to update task:", error);
      }
    }
  };

  const toggleOptionsVisibility = (taskId: string) => {
    setVisibleOptions(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  if (tasksLoading) return <div>Loading tasks...</div>;
  if (tasksError) return <div>Error loading tasks: {tasksError.message}</div>;

  const filteredTasks = tasks.filter(task => showCompleted || !task.completed);

  return (
    <div className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4 transition-all duration-300 hover:shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-[#1A1A1A] border-b pb-2">Your Tasks</h2>
      <form onSubmit={handleSubmit} className="mb-6">
        {/* First Row: New Task Title */}
        <div className="flex items-center mb-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="New task title"
            className="flex-grow shadow-sm border-gray-300 rounded-md py-2 px-3 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#333333] focus:border-[#333333]"
          />
        </div>
        {/* Second Row: Estimated Pomodoros and Project Selection */}
        <div className="flex items-center justify-between w-full">
          <input
            type="number"
            value={estimatedPomodoros}
            onChange={(e) => setEstimatedPomodoros(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="Estimated Pomodoros"
            className="shadow-sm border-gray-300 rounded-md py-2 px-3 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#333333] focus:border-[#333333] w-1/3"
          />
          <div className="relative w-2/5">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value === '') {
                  setSelectedProjectId(''); // Clear selected project when input is empty
                }
              }}
              placeholder="Select a project"
              className="shadow-sm border-gray-300 rounded-md py-2 px-3 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#333333] focus:border-[#333333] w-full pr-10"
              onFocus={() => setIsDropdownActive(true)}
              onBlur={() => {
                setTimeout(() => {
                  setIsDropdownActive(false);
                }, 100);
              }}
            />
            <span className="absolute right-3 top-2.5 text-[#1A1A1A] ">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
            {isDropdownActive && (
              <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto">
                {projects.filter(project => 
                  searchTerm === '' || project.name.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((project) => (
                  <li
                    key={project.id}
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setSearchTerm(project.name);
                      setIsDropdownActive(false);
                    }}
                    className="cursor-pointer hover:bg-gray-100 px-3 py-2 text-[#1A1A1A]"
                  >
                    {project.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex justify-end">
            <button className="bg-[#333333] hover:bg-[#1A1A1A] text-white font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out">
            Add Task
            </button>
          </div>
        </div>
      </form>
      <div className="flex items-center mb-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={() => setShowCompleted(!showCompleted)}
            className="hidden"
            id="showCompleted"
          />
          <label 
            htmlFor="showCompleted" 
            className="flex items-center cursor-pointer text-[#1A1A1A] transition duration-200 ease-in-out"
          >
            <span className={`w-5 h-5 flex items-center justify-center border-2 rounded-md ${showCompleted ? 'bg-[#333333] text-white' : 'bg-white'} transition duration-200 ease-in-out`}>
              {showCompleted && <span className="text-xs">✔️</span>}
            </span>
            <span className="ml-2">Show completed tasks</span>
          </label>
        </div>
      </div>
      <ul className="space-y-3">
        {filteredTasks.map((task) => (
          <li key={task.id} className={`rounded-md p-4 shadow-sm transition-all duration-200 hover:shadow-md ${task.completed ? 'bg-[#e0f7fa]' : 'bg-[#f2f2f2]'}`}>
            {/* Check if the task is being edited */}
            {editingTask && editingTask.id === task.id ? (
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="flex-grow shadow-sm border-gray-300 rounded-md py-2 px-3 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#333333] focus:border-[#333333]"
                  />
                  <input
                    type="number"
                    value={editingTask.estimatedPomodoros}
                    onChange={(e) => setEditingTask({ ...editingTask, estimatedPomodoros: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="shadow-sm border-gray-300 rounded-md py-2 px-3 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#333333] focus:border-[#333333]"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <button type="submit" onClick={handleUpdateTask} className="bg-[#333333] hover:bg-[#1A1A1A] text-white font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out">
                    Save
                  </button>
                  <button type="button" onClick={() => setEditingTask(null)} className="bg-[#666666] hover:bg-[#333333] text-white font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out">
                    Cancel
                  </button>
                </div>
              </div>
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
                    {task.completed && <span className="ml-2 text-green-500">✔️</span>}
                  </span>
                  <span className="text-sm text-[#666666]">
                    {task.totalPomodoroSessions || 0}/{task.estimatedPomodoros || 0} sessions
                  </span>
                </div>
                <div className="relative">
                  <button 
                    onClick={() => toggleOptionsVisibility(task.id)} 
                    className="text-[#333333] hover:text-[#1A1A1A] font-medium text-sm"
                  >
                    &#x2026; {/* Three dots icon */}
                  </button>
                  {visibleOptions[task.id] && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-10">
                      <div className="py-1">
                        <button 
                          onClick={() => {
                            setEditingTask({ id: task.id, title: task.title, estimatedPomodoros: task.estimatedPomodoros });
                            setVisibleOptions(prev => ({ ...prev, [task.id]: false })); // Hide options after selecting edit
                          }}
                          className="block px-4 py-2 text-sm text-[#333333] hover:bg-gray-100 w-full text-left"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => {
                            deleteTask(task.id);
                            setVisibleOptions(prev => ({ ...prev, [task.id]: false })); // Hide options after deleting
                          }}
                          className="block px-4 py-2 text-sm text-[#333333] hover:bg-gray-100 w-full text-left"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}