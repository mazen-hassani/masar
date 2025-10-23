// ABOUTME: Projects listing page - displays all user projects with management options
// ABOUTME: Allows creating new projects and navigating to project details

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardHeader, CardContent, Alert, Modal } from "../../components/common";
import { ProjectForm } from "../../components/forms";
import * as projectService from "../../services/projectService";
import { Project, ProjectFormData } from "../../types";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await projectService.getProjects();
      setProjects(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load projects";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    try {
      const newProject = await projectService.createProject({
        name: data.name,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
      });
      setProjects([...projects, newProject]);
      setShowCreateModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create project";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      try {
        await projectService.deleteProject(projectId);
        setProjects(projects.filter((p) => p.id !== projectId));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete project";
        setError(message);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-2">Manage your projects and tasks</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          size="lg"
        >
          + New Project
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          variant="error"
          title="Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Project"
        size="md"
      >
        <ProjectForm
          onSubmit={handleCreateProject}
          isLoading={isSubmitting}
          submitLabel="Create Project"
        />
      </Modal>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">No projects yet</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="primary"
            >
              Create Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {project.name}
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm line-clamp-2">
                  {project.description || "No description"}
                </p>
                <div className="text-sm text-gray-500 space-y-1">
                  {project.startDate && (
                    <p>
                      Start:{" "}
                      {new Date(project.startDate).toLocaleDateString()}
                    </p>
                  )}
                  {project.endDate && (
                    <p>
                      End: {new Date(project.endDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => navigate(`/projects/${project.id}`)}
                    variant="primary"
                    size="sm"
                    className="flex-1"
                  >
                    View
                  </Button>
                  <Button
                    onClick={() => handleDeleteProject(project.id)}
                    variant="danger"
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
