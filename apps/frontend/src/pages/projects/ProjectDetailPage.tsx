// ABOUTME: Project detail page - view and manage project activities and tasks
// ABOUTME: Shows project overview, activities list, and allows creating new activities

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Alert,
  Modal,
} from "../../components/common";
import { ActivityForm } from "../../components/forms";
import * as projectService from "../../services/projectService";
import { Project, Activity, ActivityFormData } from "../../types";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [projectData, activitiesData] = await Promise.all([
        projectService.getProject(projectId),
        projectService.getProjectActivities(projectId),
      ]);
      setProject(projectData);
      setActivities(activitiesData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load project";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateActivity = async (data: ActivityFormData) => {
    if (!projectId) return;
    setIsSubmitting(true);
    try {
      const newActivity = await projectService.createActivity(projectId, {
        name: data.name,
        description: data.description,
      });
      setActivities([...activities, newActivity]);
      setShowCreateModal(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create activity";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!projectId) return;
    if (window.confirm("Are you sure you want to delete this activity?")) {
      try {
        await projectService.deleteActivity(projectId, activityId);
        setActivities(activities.filter((a) => a.id !== activityId));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete activity";
        setError(message);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <Alert
        variant="error"
        title="Project Not Found"
        message="The project you're looking for doesn't exist or you don't have access to it."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Button
            onClick={() => navigate("/projects")}
            variant="secondary"
            size="sm"
            className="mb-3"
          >
            ← Back to Projects
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-600 mt-2">{project.description}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} variant="primary">
          + New Activity
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

      {/* Project Info */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Project Details</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-600 text-sm mb-1">Status</p>
              <p className="text-gray-900 font-medium">{project.status || "Active"}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">Start Date</p>
              <p className="text-gray-900 font-medium">
                {project.startDate
                  ? new Date(project.startDate).toLocaleDateString()
                  : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm mb-1">End Date</p>
              <p className="text-gray-900 font-medium">
                {project.endDate
                  ? new Date(project.endDate).toLocaleDateString()
                  : "Not set"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Activity Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Activity"
        size="md"
      >
        <ActivityForm
          onSubmit={handleCreateActivity}
          isLoading={isSubmitting}
          submitLabel="Create Activity"
        />
      </Modal>

      {/* Activities List */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Activities</h2>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p>No activities yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {activity.name}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">
                      {activity.description || "No description"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        navigate(
                          `/projects/${projectId}/activities/${activity.id}`
                        )
                      }
                      variant="primary"
                      size="sm"
                    >
                      Manage
                    </Button>
                    <Button
                      onClick={() => handleDeleteActivity(activity.id)}
                      variant="danger"
                      size="sm"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
