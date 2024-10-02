import React, { useState, useEffect } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';

export default function ProjectList() {
  const { projects, loading, error, addProject, updateProject, deleteProject } = useProjects();
  const { event } = useGoogleAnalytics();
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProject, setEditingProject] = useState<{ id: string, name: string } | null>(null);
  
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 2;

  useEffect(() => {
    event('project_list_view', { total_projects: projects.length });
  }, [event, projects.length]);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      try {
        await addProject(newProjectName);
        event('project_added', { project_name: newProjectName });
        setNewProjectName('');
      } catch (err) {
        console.error("Failed to add project:", err);
        event('project_add_error', { error_message: (err as Error).message });
      }
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject && editingProject.name.trim()) {
      try {
        await updateProject(editingProject.id, editingProject.name);
        event('project_updated', { project_id: editingProject.id });
        setEditingProject(null);
      } catch (err) {
        console.error("Failed to update project:", err);
        event('project_update_error', { project_id: editingProject.id, error_message: (err as Error).message });
      }
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(id);
        event('project_deleted', { project_id: id });
      } catch (err) {
        console.error("Failed to delete project:", err);
        event('project_delete_error', { project_id: id, error_message: (err as Error).message });
      }
    }
  };

  const loadMoreProjects = () => {
    if ((currentPage + 1) * itemsPerPage < projects.length) {
      setCurrentPage(prevPage => prevPage + 1);
      event('load_more_projects', { new_page: currentPage + 1 });
    }
  };

  if (loading) return <div>Loading projects...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const displayedProjects = projects.slice(0, (currentPage + 1) * itemsPerPage);

  return (
    <div className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4 transition-all duration-300 hover:shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-[#1A1A1A] border-b pb-2">Your Projects</h2>
      
      <form onSubmit={handleAddProject} className="mb-6">
        {/* ... (form JSX remains the same) ... */}
      </form>

      <ul className="space-y-3">
        {displayedProjects.map((project) => (
          <li key={project.id} className="bg-[#f2f2f2] rounded-md p-4 shadow-sm transition-all duration-200 hover:shadow-md">
            {editingProject && editingProject.id === project.id ? (
              <form onSubmit={handleUpdateProject} className="flex items-center space-x-2">
                {/* ... (edit form JSX remains the same) ... */}
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-[#1A1A1A] overflow-hidden whitespace-nowrap overflow-ellipsis">
                  {project.name}
                </span>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => {
                      setEditingProject({ id: project.id, name: project.name });
                      event('project_edit_started', { project_id: project.id });
                    }} 
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
      {displayedProjects.length < projects.length && (
        <div className="flex justify-center mt-4">
          <button 
            onClick={loadMoreProjects} 
            className="bg-[#333333] hover:bg-[#1A1A1A] text-white font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}