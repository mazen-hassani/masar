// ABOUTME: Activity detail page - manage tasks within an activity
// ABOUTME: Shows activity overview and allows creating, editing, deleting tasks

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
import { TaskForm } from "../../components/forms";
import * as projectService from "../../services/projectService";
import { Activity, Task, TaskFormData } from "../../types";

export default function ActivityDetailPage() {
  const { projectId, activityId } = useParams<{
    projectId: string;
    activityId: string;
  }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (projectId && activityId) {
      loadActivity();
    }
  }, [projectId, activityId]);

  const loadActivity = async () => {
    if (!projectId || !activityId) return;
    setIsLoading(true);
    setError(null);
    try {
      const tasksData = await projectService.getActivityTasks(
        projectId,
        activityId
      );
      // Note: In a real scenario, we'd fetch the activity details too
      // For now, we'll use what we have
      setTasks(tasksData);
      setActivity({
        id: activityId,
        name: "Activity",
        projectId,
      } as Activity);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load activity";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async (data: TaskFormData) => {
    if (!projectId || !activityId) return;
    setIsSubmitting(true);
    try {
      const newTask = await projectService.createTask(
        projectId,
        activityId,
        {
          name: data.name,
          description: data.description,
          duration: data.duration,
        }
      );
      setTasks([...tasks, newTask]);
      setShowCreateModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create task";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!projectId || !activityId) return;
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await projectService.deleteTask(projectId, activityId, taskId);
        setTasks(tasks.filter((t) => t.id !== taskId));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete task";
        setError(message);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading activity...</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <Alert
        variant="error"
        title="Activity Not Found"
        message="The activity you're looking for doesn't exist."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Button
            onClick={() => navigate(`/projects/${projectId}`)}
            variant="secondary"
            size="sm"
            className="mb-3"
          >
            ← Back to Project
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">{activity.name}</h1>
          <p className="text-gray-600 mt-2">{activity.description}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} variant="primary">
          + New Task
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

      {/* Create Task Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Task"
        size="md"
      >
        <TaskForm
          onSubmit={handleCreateTask}
          isLoading={isSubmitting}
          submitLabel="Create Task"
        />
      </Modal>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p>No tasks yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {task.name}
                    </h3>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                      {task.description && <span>{task.description}</span>}
                      {task.duration && (
                        <span>Duration: {task.duration} days</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        // TODO: Implement task edit
                      }}
                      variant="primary"
                      size="sm"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteTask(task.id)}
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
