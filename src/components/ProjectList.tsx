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
    <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
      <h2 className="text-2xl font-bold mb-4">Your Projects</h2>
      
      <form onSubmit={handleAddProject} className="mb-4">
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
          <li key={project.id} className="mb-2 flex items-center justify-between">
            {editingProject && editingProject.id === project.id ? (
              <form onSubmit={handleUpdateProject} className="flex-grow mr-2">
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
                <button type="submit" className="mt-2 bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs">
                  Save
                </button>
                <button type="button" onClick={() => setEditingProject(null)} className="mt-2 ml-2 bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded text-xs">
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <span>{project.name}</span>
                <div>
                  <button onClick={() => setEditingProject({ id: project.id, name: project.name })} className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded text-xs mr-2">
                    Edit
                  </button>
                  <button onClick={() => handleDeleteProject(project.id)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs">
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