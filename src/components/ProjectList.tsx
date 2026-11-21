import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useProjects } from '../hooks/useProjects';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Trash2, Plus, MoreHorizontal, FolderOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ProjectList = React.memo(() => {
  const { projects, loading, error, addProject, updateProject, deleteProject } = useProjects();
  const { event } = useGoogleAnalytics();
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProject, setEditingProject] = useState<{ id: string, name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;

  const memoizedProjects = useMemo(() => projects, [projects]);

  useEffect(() => {
    event('project_list_view', { total_projects: projects.length });
  }, [event, projects.length]);

  const handleAddProject = useCallback(async (e: React.FormEvent) => {
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
  }, [addProject, event, newProjectName]);

  const handleUpdateProject = useCallback(async (e: React.FormEvent) => {
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
  }, [editingProject, updateProject, event]);

  const handleDeleteProject = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(id);
        event('project_deleted', { project_id: id });
      } catch (err) {
        console.error("Failed to delete project:", err);
        event('project_delete_error', { project_id: id, error_message: (err as Error).message });
      }
    }
  }, [deleteProject, event]);

  const handleEditProject = useCallback((project: { id: string, name: string }) => {
    setEditingProject(project);
    event('project_edit_started', { project_id: project.id });
  }, [event]);

  const loadMoreProjects = useCallback(() => {
    if ((currentPage + 1) * itemsPerPage < projects.length) {
      setCurrentPage(prevPage => prevPage + 1);
      event('load_more_projects', { new_page: currentPage + 1 });
    }
  }, [currentPage, itemsPerPage, projects.length, event]);

  const displayedProjects = useMemo(() => 
    memoizedProjects.slice(0, (currentPage + 1) * itemsPerPage),
    [memoizedProjects, currentPage, itemsPerPage]
  );

  if (loading) return <div>Loading projects...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <Card className="w-full border-0 bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Your Projects</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <form onSubmit={handleAddProject} className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6">
          <Input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="New project name"
            aria-label="New project name"
            className="flex-grow min-w-0"
          />
          <Button type="submit" disabled={!newProjectName.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Project
          </Button>
        </form>

        {projects.length === 0 && <p className="py-6 text-sm text-muted-foreground">Start with one project, like Work or Personal. You can always add more later.</p>}
        <ul>
          {displayedProjects.map((project) => (
            <li key={project.id} className="flex items-center justify-between gap-3 border-b py-5">
              {editingProject && editingProject.id === project.id ? (
                <form onSubmit={handleUpdateProject} className="flex flex-wrap items-center gap-2 w-full min-w-0">
                  <Input
                    type="text"
                    value={editingProject.name}
                    onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                    className="flex-1 min-w-0 basis-full sm:basis-auto"
                  />
                  <Button type="submit" size="sm" variant="outline">Save</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingProject(null)}>Cancel</Button>
                </form>
              ) : (
                <>
                  <Link href={`/tasks?project=${encodeURIComponent(project.id)}`} className="flex min-w-0 flex-1 items-center gap-3 text-base hover:underline">
                    <FolderOpen className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">{project.name}</span>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" aria-label={`Actions for ${project.name}`}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditProject(project)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteProject(project.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </li>
          ))}
        </ul>
        {displayedProjects.length < memoizedProjects.length && (
          <div className="flex justify-center mt-4">
            <Button onClick={loadMoreProjects} variant="outline">
              Load More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

ProjectList.displayName = 'ProjectList';

export default ProjectList;
