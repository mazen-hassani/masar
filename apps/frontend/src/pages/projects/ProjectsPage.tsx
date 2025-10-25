// ABOUTME: Projects listing page - displays all user projects with management options
// ABOUTME: Allows creating new projects and navigating to project details

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "../../context/LanguageContext";
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

type SortBy = "name" | "status" | "progress" | "date";
type FilterStatus = "all" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" | "NOT_STARTED";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date");

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

      // Invalidate dashboard analytics so it refreshes with new project
      queryClient.invalidateQueries({ queryKey: ["dashboard-analytics"] });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('failed');
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm(t('are_you_sure'))) {
      try {
        await projectService.deleteProject(projectId);
        setProjects(projects.filter((p) => p.id !== projectId));
      } catch (err) {
        const message = err instanceof Error ? err.message : t('failed');
        setError(message);
      }
    }
  };

  // Calculate project stats
  const activeProjects = projects.filter((p) => p.status === "IN_PROGRESS").length;
  const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;
  const onHoldProjects = projects.filter((p) => p.status === "ON_HOLD").length;

  // Filter and sort projects
  const filteredProjects = projects.filter((p) => {
    if (filterStatus === "all") return true;
    return p.status === filterStatus;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "progress":
        return (b.progressPercentage || 0) - (a.progressPercentage || 0);
      case "status":
        return (a.status || "").localeCompare(b.status || "");
      case "date":
        return new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime();
      default:
        return 0;
    }
  });

  // Status color mapping
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "COMPLETED":
        return "emerald";
      case "IN_PROGRESS":
        return "blue";
      case "ON_HOLD":
        return "amber";
      case "NOT_STARTED":
        return "slate";
      default:
        return "gray";
    }
  };

  // Status icon mapping
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "COMPLETED":
        return "✓";
      case "IN_PROGRESS":
        return "⚡";
      case "ON_HOLD":
        return "⏸";
      case "NOT_STARTED":
        return "○";
      default:
        return "?";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Gradient Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-teal-600 p-8 md:p-12 shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-block mb-3">
              <span className="text-5xl">📊</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              {t('projects')}
            </h1>
            <p className="text-blue-100 text-lg">
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            size="lg"
            className="bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-md"
          >
            + {t('new_project')}
          </Button>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{t('total_projects')}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{projects.length}</p>
              </div>
              <span className="text-4xl">📊</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{t('active_projects')}</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{activeProjects}</p>
              </div>
              <span className="text-4xl">⚡</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{t('completed_projects')}</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{completedProjects}</p>
              </div>
              <span className="text-4xl">✓</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">On Hold</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{onHoldProjects}</p>
              </div>
              <span className="text-4xl">⏸</span>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('create_project')}
        size="md"
      >
        <ProjectForm
          onSubmit={handleCreateProject}
          isLoading={isSubmitting}
          submitLabel={t('create_project')}
        />
      </Modal>

      {/* Filter and Sort Controls */}
      {projects.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">Latest First</option>
                <option value="name">Name (A-Z)</option>
                <option value="progress">Highest Progress</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-2 md:mt-6">
            Showing {sortedProjects.length} of {projects.length} projects
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-block mb-4">
            <span className="text-8xl">📁</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('no_projects')}</h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {t('create_first_project')}
          </p>
          <Button onClick={() => setShowCreateModal(true)} variant="primary" size="lg">
            {t('create_first_project')}
          </Button>
        </div>
      ) : sortedProjects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <span className="text-6xl mb-4 block">🔍</span>
          <p className="text-gray-600 text-lg">No projects match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProjects.map((project) => {
            const progress = project.progressPercentage || 0;
            const daysUntilEnd = project.endDate
              ? Math.ceil(
                  (new Date(project.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                )
              : null;
            const statusColor = getStatusColor(project.status);
            const statusIcon = getStatusIcon(project.status);

            return (
              <div
                key={project.id}
                className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-200 flex flex-col overflow-hidden hover:translate-y-[-4px]"
              >
                {/* Gradient Top Bar */}
                <div className={`h-1 bg-gradient-to-r from-blue-500 to-teal-500`}></div>

                {/* Card Header */}
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {project.name}
                    </h3>
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold
                      ${statusColor === 'emerald' ? 'bg-emerald-100 text-emerald-700' : ''}
                      ${statusColor === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                      ${statusColor === 'amber' ? 'bg-amber-100 text-amber-700' : ''}
                      ${statusColor === 'slate' ? 'bg-slate-100 text-slate-700' : ''}
                    `}>
                      <span>{statusIcon}</span>
                      <span>{project.status?.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2 h-10">
                    {project.description || t('no_description')}
                  </p>
                </div>

                {/* Card Body */}
                <div className="flex-1 px-6 py-5 space-y-4">
                  {/* Progress Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('progress')}</span>
                      <span className={`text-sm font-bold ${
                        progress >= 80 ? 'text-emerald-600' :
                        progress >= 50 ? 'text-blue-600' :
                        progress >= 20 ? 'text-amber-600' : 'text-gray-600'
                      }`}>
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          progress >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                          progress >= 50 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                          progress >= 20 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                          'bg-gradient-to-r from-gray-400 to-gray-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Dates Section */}
                  {(project.startDate || project.endDate) && (
                    <div className="grid grid-cols-2 gap-4">
                      {project.startDate && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">Start</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {new Date(project.startDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                      {project.endDate && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">End</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {new Date(project.endDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Days Remaining */}
                  {daysUntilEnd !== null && (
                    <div className={`p-3 rounded-lg border ${
                      daysUntilEnd > 14 ? 'bg-blue-50 border-blue-200 text-blue-700' :
                      daysUntilEnd > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      daysUntilEnd === 0 ? 'bg-red-50 border-red-200 text-red-700' :
                      'bg-red-50 border-red-200 text-red-700'
                    }`}>
                      <p className="text-xs font-semibold">
                        {daysUntilEnd > 0
                          ? `${daysUntilEnd} ${t('days_remaining')}`
                          : daysUntilEnd === 0
                          ? t('due_today')
                          : `${Math.abs(daysUntilEnd)} ${t('days_overdue')}`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-2">
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
                    className="px-4"
                  >
                    🗑
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
