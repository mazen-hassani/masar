// ABOUTME: Projects listing page - displays all user projects with management options
// ABOUTME: Allows creating new projects and navigating to project details

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardContent,
  Alert,
  Modal,
  StatusBadge,
  ProgressBar,
  StatCard,
} from "../../components/common";
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

  // Calculate project stats
  const activeProjects = projects.filter((p) => p.status === "IN_PROGRESS").length;
  const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;

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
          <p className="text-gray-600 mt-2">Manage and track your projects</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} variant="primary" size="lg">
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

      {/* Stats Cards */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Projects"
            value={projects.length}
            icon="📊"
            color="blue"
          />
          <StatCard
            label="Active"
            value={activeProjects}
            icon="⚡"
            color="green"
          />
          <StatCard
            label="Completed"
            value={completedProjects}
            icon="✓"
            color="purple"
          />
        </div>
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
            <p className="text-6xl mb-4">📁</p>
            <p className="text-gray-600 mb-4 text-lg font-medium">No projects yet</p>
            <p className="text-gray-500 mb-6">
              Create your first project to get started with managing your tasks
            </p>
            <Button onClick={() => setShowCreateModal(true)} variant="primary">
              Create Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const progress = project.progressPercentage || 0;
            const daysUntilEnd = project.endDate
              ? Math.ceil(
                  (new Date(project.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                )
              : null;

            return (
              <div
                key={project.id}
                className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200 flex flex-col"
              >
                {/* Card Header */}
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1 line-clamp-2">
                      {project.name}
                    </h3>
                    <StatusBadge status={project.status || "NOT_STARTED"} size="sm" />
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {project.description || "No description"}
                  </p>
                </div>

                {/* Card Body */}
                <div className="flex-1 px-6 py-4 space-y-4">
                  {/* Progress Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">Progress</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {progress}%
                      </span>
                    </div>
                    <ProgressBar progress={progress} size="sm" color="blue" />
                  </div>

                  {/* Dates Section */}
                  <div className="grid grid-cols-2 gap-4">
                    {project.startDate && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Start</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(project.startDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    )}
                    {project.endDate && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">End</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(project.endDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Days Remaining */}
                  {daysUntilEnd !== null && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-600">
                        {daysUntilEnd > 0
                          ? `${daysUntilEnd} days remaining`
                          : daysUntilEnd === 0
                          ? "Due today"
                          : `${Math.abs(daysUntilEnd)} days overdue`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
