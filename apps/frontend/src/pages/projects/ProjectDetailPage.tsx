// ABOUTME: Project detail page - view and manage project activities and tasks
// ABOUTME: Shows project overview, activities list, and allows creating new activities

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardContent,
  Alert,
  Modal,
  ProjectHeader,
  ActivityCard,
  StatCard,
  TaskDetailModal,
} from "../../components/common";
import { ActivityForm } from "../../components/forms";
import * as projectService from "../../services/projectService";
import { Project, Activity, Task, ActivityFormData } from "../../types";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityTasks, setActivityTasks] = useState<Record<string, Task[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

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

      // Load tasks for each activity
      const tasksMap: Record<string, Task[]> = {};
      await Promise.all(
        activitiesData.map(async (activity) => {
          try {
            const tasks = await projectService.getActivityTasks(projectId, activity.id);
            tasksMap[activity.id] = tasks;
          } catch {
            tasksMap[activity.id] = [];
          }
        })
      );
      setActivityTasks(tasksMap);
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
      setActivityTasks({ ...activityTasks, [newActivity.id]: [] });
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
    try {
      await projectService.deleteActivity(projectId, activityId);
      setActivities(activities.filter((a) => a.id !== activityId));
      const newTasksMap = { ...activityTasks };
      delete newTasksMap[activityId];
      setActivityTasks(newTasksMap);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete activity";
      setError(message);
    }
  };

  const handleViewTasks = (activityId: string) => {
    navigate(`/projects/${projectId}/activities/${activityId}`);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
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

  const projectTabs = [
    { label: "Overview", path: `/projects/${projectId}`, icon: "📋" },
    { label: "Gantt", path: `/projects/${projectId}/gantt`, icon: "📊" },
    { label: "Kanban", path: `/projects/${projectId}/kanban`, icon: "📌" },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Button
          onClick={() => navigate("/projects")}
          variant="secondary"
          size="sm"
          className="mb-4"
        >
          ← Back to Projects
        </Button>
      </div>

      {/* Project Header */}
      <ProjectHeader
        project={project}
        tabs={projectTabs}
        activeTab={`/projects/${projectId}`}
      />

      {/* Error Alert */}
      {error && (
        <Alert
          variant="error"
          title="Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Quick Stats */}
      {activities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Activities"
            value={activities.length}
            icon="📝"
            color="blue"
          />
          <StatCard
            label="Total Tasks"
            value={Object.values(activityTasks).flat().length}
            icon="✓"
            color="green"
          />
          <StatCard
            label="Completed"
            value={Object.values(activityTasks)
              .flat()
              .filter((t) => t.status === "COMPLETED" || t.status === "VERIFIED").length}
            icon="🎉"
            color="purple"
          />
          <StatCard
            label="In Progress"
            value={Object.values(activityTasks)
              .flat()
              .filter((t) => t.status === "IN_PROGRESS").length}
            icon="⚡"
            color="yellow"
          />
        </div>
      )}

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

      {/* View Selector - Prominent Chart Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => {}}
          className="p-4 bg-white border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors text-left"
        >
          <p className="text-2xl mb-2">📋</p>
          <p className="font-semibold text-gray-900">Overview</p>
          <p className="text-sm text-gray-600 mt-1">View activities and tasks</p>
        </button>
        <button
          onClick={() => navigate(`/projects/${projectId}/gantt`)}
          className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
        >
          <p className="text-2xl mb-2">📊</p>
          <p className="font-semibold text-gray-900">Gantt Chart</p>
          <p className="text-sm text-gray-600 mt-1">View project timeline</p>
        </button>
        <button
          onClick={() => navigate(`/projects/${projectId}/kanban`)}
          className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
        >
          <p className="text-2xl mb-2">📌</p>
          <p className="font-semibold text-gray-900">Kanban Board</p>
          <p className="text-sm text-gray-600 mt-1">Manage tasks by status</p>
        </button>
      </div>

      {/* Activities List */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Activities</h2>
          <Button onClick={() => setShowCreateModal(true)} variant="primary">
            + New Activity
          </Button>
        </div>

        {activities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-6xl mb-4">🎯</p>
              <p className="text-gray-600 mb-4 text-lg font-medium">
                No activities yet
              </p>
              <p className="text-gray-500 mb-6">
                Create your first activity to organize your project work
              </p>
              <Button onClick={() => setShowCreateModal(true)} variant="primary">
                Create Activity
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                tasks={activityTasks[activity.id] || []}
                onEdit={() => {}} // TODO: Add edit modal
                onDelete={handleDeleteActivity}
                onViewTasks={handleViewTasks}
                onTaskClick={handleTaskClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setSelectedTask(null);
        }}
      />
    </div>
  );
}
