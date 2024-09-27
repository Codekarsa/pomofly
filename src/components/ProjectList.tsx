import React, { useState } from 'react';
import { useProjects } from '../hooks/useProjects';

export default function ProjectList() {
  const { projects, loading, error, addProject, updateProject, deleteProject } = useProjects();
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProject, setEditingProject] = useState<{ id: string, name: string } | null>(null);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      try {
        await addProject(newProjectName);
        setNewProjectName('');
      } catch (err) {
        console.error("Failed to add project:", err);
        // You might want to show an error message to the user here
      }
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject && editingProject.name.trim()) {
      try {
        await updateProject(editingProject.id, editingProject.name);
        setEditingProject(null);
      } catch (err) {
        console.error("Failed to update project:", err);
        // You might want to show an error message to the user here
      }
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(id);
      } catch (err) {
        console.error("Failed to delete project:", err);
        // You might want to show an error message to the user here
      }
    }
  };

  if (loading) return <div>Loading projects...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4 transition-all duration-300 hover:shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-[#1A1A1A] border-b pb-2">Your Projects</h2>
      
      <form onSubmit={handleAddProject} className="mb-6">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="New project name"
            className="flex-grow shadow-sm border-gray-300 rounded-md py-2 px-3 text-[#1A1A1A] focus:ring-2 focus:ring-[#333333] focus:border-[#333333]"
          />
          <button type="submit" className="bg-[#333333] hover:bg-[#1A1A1A] text-white font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out transform hover:scale-105">
            Add Project
          </button>
        </div>
      </form>

      <ul className="space-y-3">
        {projects.map((project) => (
          <li key={project.id} className="bg-[#f2f2f2] rounded-md p-4 shadow-sm transition-all duration-200 hover:shadow-md">
            {editingProject && editingProject.id === project.id ? (
              <form onSubmit={handleUpdateProject} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="flex-grow shadow-sm border-gray-300 rounded-md py-1 px-2 text-[#1A1A1A] focus:ring-2 focus:ring-[#333333] focus:border-[#333333]"
                />
                <button type="submit" className="bg-[#333333] hover:bg-[#1A1A1A] text-white font-bold py-1 px-2 rounded-md text-sm transition duration-150 ease-in-out">
                  Save
                </button>
                <button type="button" onClick={() => setEditingProject(null)} className="bg-[#666666] hover:bg-[#333333] text-white font-bold py-1 px-2 rounded-md text-sm transition duration-150 ease-in-out">
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-[#1A1A1A] overflow-hidden whitespace-nowrap overflow-ellipsis">
                  {project.name}
                </span>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setEditingProject({ id: project.id, name: project.name })} 
                    className="text-[#333333] hover:text-[#1A1A1A] font-medium text-sm"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteProject(project.id)} 
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