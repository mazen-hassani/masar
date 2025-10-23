// ABOUTME: Kanban board page - displays tasks organized by status
// ABOUTME: Allows drag-and-drop task status updates and task management

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardContent, Alert } from "../../components/common";
import {
  KanbanBoard,
  KanbanCard,
} from "../../components/kanban/KanbanBoard";
import * as projectService from "../../services/projectService";
import { Status } from "../../types";

export default function KanbanPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<KanbanCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProjectTasks();
    }
  }, [projectId]);

  const loadProjectTasks = async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const activities = await projectService.getProjectActivities(projectId);

      // Collect all tasks from all activities
      const allTasks: KanbanCard[] = [];
      for (const activity of activities) {
        const activityTasks = await projectService.getActivityTasks(
          projectId,
          activity.id
        );
        const kanbanCards = activityTasks.map((task) => ({
          id: task.id,
          title: task.name,
          description: task.description,
          status: task.status,
          dueDate: task.endDate ? new Date(task.endDate) : undefined,
          priority: (task.startDate
            ? Math.random() > 0.7
              ? "high"
              : Math.random() > 0.5
                ? "medium"
                : "low"
            : "low") as "low" | "medium" | "high",
          assignee: task.assignee?.firstName
            ? `${task.assignee.firstName} ${task.assignee.lastName}`
            : undefined,
        }));
        allTasks.push(...kanbanCards);
      }

      setTasks(allTasks);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load tasks";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardMove = async (cardId: string, newStatus: Status) => {
    if (!projectId) return;

    try {
      const updatedTasks = tasks.map((task) =>
        task.id === cardId ? { ...task, status: newStatus } : task
      );
      setTasks(updatedTasks);

      // TODO: Call API to update task status
      // await projectService.updateTask(projectId, activity_id, cardId, { status: newStatus });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update task";
      setError(message);
      loadProjectTasks(); // Reload on error
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Task Board</h1>
        <p className="text-gray-600 mt-2">
          Organize and manage tasks by status. Drag and drop to update task status.
        </p>
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

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tasks...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Kanban Board */}
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No tasks found. Create activities and tasks to see them here.</p>
                </div>
              ) : (
                <KanbanBoard
                  cards={tasks}
                  onCardMove={handleCardMove}
                  onCardClick={setSelectedCard}
                  statuses={[
                    Status.NOT_STARTED,
                    Status.IN_PROGRESS,
                    Status.ON_HOLD,
                    Status.COMPLETED,
                    Status.VERIFIED,
                  ]}
                />
              )}
            </CardContent>
          </Card>

          {/* Task Details */}
          {selectedCard && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">
                  Task Details: {selectedCard.title}
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedCard.description && (
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Description</p>
                    <p className="text-gray-900">{selectedCard.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Status</p>
                    <p className="text-gray-900 font-medium">
                      {selectedCard.status.replace(/_/g, " ")}
                    </p>
                  </div>

                  {selectedCard.priority && (
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Priority</p>
                      <span
                        className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                          selectedCard.priority === "high"
                            ? "bg-red-100 text-red-800"
                            : selectedCard.priority === "medium"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {selectedCard.priority.toUpperCase()}
                      </span>
                    </div>
                  )}

                  {selectedCard.dueDate && (
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Due Date</p>
                      <p className="text-gray-900 font-medium">
                        {new Date(selectedCard.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {selectedCard.assignee && (
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Assigned To</p>
                      <p className="text-gray-900 font-medium">
                        {selectedCard.assignee}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
