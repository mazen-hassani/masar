// ABOUTME: Kanban board page - displays tasks organized by status
// ABOUTME: Allows drag-and-drop task status updates and task management

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { Alert, Button } from "../../components/common";
import {
  KanbanBoard,
  KanbanCard,
} from "../../components/kanban/KanbanBoard";
import * as projectService from "../../services/projectService";
import { Status } from "../../types";

interface KanbanCardWithActivity extends KanbanCard {
  activityId: string;
}

// Status configuration for visual styling
const STATUS_CONFIG: Record<Status, { icon: string; color: string; bgColor: string; borderColor: string }> = {
  NOT_STARTED: { icon: "○", color: "slate", bgColor: "bg-slate-50", borderColor: "border-slate-200" },
  IN_PROGRESS: { icon: "⚡", color: "blue", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  ON_HOLD: { icon: "⏸", color: "amber", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  COMPLETED: { icon: "✓", color: "emerald", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  VERIFIED: { icon: "✓✓", color: "purple", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
};

export default function KanbanPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<KanbanCardWithActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<KanbanCardWithActivity | null>(null);
  const [project, setProject] = useState<any>(null);

  // Calculate task statistics
  const taskStats = {
    total: tasks.length,
    notStarted: tasks.filter((t) => t.status === Status.NOT_STARTED).length,
    inProgress: tasks.filter((t) => t.status === Status.IN_PROGRESS).length,
    onHold: tasks.filter((t) => t.status === Status.ON_HOLD).length,
    completed: tasks.filter((t) => t.status === Status.COMPLETED).length,
    verified: tasks.filter((t) => t.status === Status.VERIFIED).length,
  };

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
      // Load project details and activities in parallel
      const [projectData, activities] = await Promise.all([
        projectService.getProject(projectId),
        projectService.getProjectActivities(projectId),
      ]);

      setProject(projectData);

      // Collect all tasks from all activities
      const allTasks: KanbanCardWithActivity[] = [];
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
          activityId: activity.id,
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

    // Find the task and its activity
    const taskToMove = tasks.find((t) => t.id === cardId);
    if (!taskToMove) return;

    try {
      // Update local state optimistically
      const updatedTasks = tasks.map((task) =>
        task.id === cardId ? { ...task, status: newStatus } : task
      );
      setTasks(updatedTasks);

      // Call API to update task status
      await projectService.updateTask(projectId, taskToMove.activityId, cardId, {
        status: newStatus,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('failed');
      setError(message);
      // Reload on error to revert optimistic update
      loadProjectTasks();
    }
  };

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Button
        onClick={() => navigate(`/projects/${projectId}`)}
        variant="secondary"
        size="sm"
        className="mb-2"
      >
        ← {t('back')}
      </Button>

      {/* Gradient Header */}
      {project && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 p-8 md:p-12 shadow-lg">
          <div className="relative z-10">
            <div className="inline-block mb-3">
              <span className="text-5xl">📌</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              {project.name}
            </h1>
            <p className="text-blue-100 text-lg">
              {t('task_board')} • {taskStats.total} {taskStats.total === 1 ? "task" : "tasks"}
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          variant="error"
          title="Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Task Statistics */}
      {!isLoading && tasks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow text-center">
            <p className="text-2xl mb-1">📊</p>
            <p className="text-gray-600 text-xs font-medium">Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{taskStats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow text-center">
            <p className="text-2xl mb-1">{STATUS_CONFIG.NOT_STARTED.icon}</p>
            <p className="text-gray-600 text-xs font-medium">Not Started</p>
            <p className="text-2xl font-bold text-slate-600 mt-1">{taskStats.notStarted}</p>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-4 hover:shadow-md transition-shadow text-center">
            <p className="text-2xl mb-1">{STATUS_CONFIG.IN_PROGRESS.icon}</p>
            <p className="text-gray-600 text-xs font-medium">In Progress</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{taskStats.inProgress}</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4 hover:shadow-md transition-shadow text-center">
            <p className="text-2xl mb-1">{STATUS_CONFIG.ON_HOLD.icon}</p>
            <p className="text-gray-600 text-xs font-medium">On Hold</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{taskStats.onHold}</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-4 hover:shadow-md transition-shadow text-center">
            <p className="text-2xl mb-1">{STATUS_CONFIG.COMPLETED.icon}</p>
            <p className="text-gray-600 text-xs font-medium">Completed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{taskStats.completed}</p>
          </div>
          <div className="bg-white rounded-xl border border-purple-200 p-4 hover:shadow-md transition-shadow text-center">
            <p className="text-2xl mb-1">{STATUS_CONFIG.VERIFIED.icon}</p>
            <p className="text-gray-600 text-xs font-medium">Verified</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{taskStats.verified}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('loading')}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Kanban Board Container */}
          <div className="bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            {tasks.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-block mb-4">
                  <span className="text-7xl">📋</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('no_tasks')}</h3>
                <p className="text-gray-600 mb-6">
                  {t('create_first_project')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <KanbanBoard
                  cards={tasks}
                  onCardMove={handleCardMove}
                  onCardClick={(card) => setSelectedCard(card as KanbanCardWithActivity)}
                  statuses={[
                    Status.NOT_STARTED,
                    Status.IN_PROGRESS,
                    Status.ON_HOLD,
                    Status.COMPLETED,
                    Status.VERIFIED,
                  ]}
                />
              </div>
            )}
          </div>

          {/* Task Details Sidebar */}
          {selectedCard && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-md">
              <div className="bg-gradient-to-r from-blue-500 to-teal-500 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Task Details</h2>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Task Title */}
                <div>
                  <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-2">
                    Task Title
                  </p>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedCard.title}
                  </h3>
                </div>

                {/* Description */}
                {selectedCard.description && (
                  <div>
                    <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-2">
                      Description
                    </p>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedCard.description}
                    </p>
                  </div>
                )}

                {/* Status */}
                <div>
                  <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-2">
                    {t('status')}
                  </p>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm ${
                    selectedCard.status === Status.COMPLETED ? 'bg-emerald-100 text-emerald-700' :
                    selectedCard.status === Status.IN_PROGRESS ? 'bg-blue-100 text-blue-700' :
                    selectedCard.status === Status.ON_HOLD ? 'bg-amber-100 text-amber-700' :
                    selectedCard.status === Status.NOT_STARTED ? 'bg-slate-100 text-slate-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    <span className="text-lg">
                      {selectedCard.status === Status.COMPLETED ? '✓' :
                       selectedCard.status === Status.IN_PROGRESS ? '⚡' :
                       selectedCard.status === Status.ON_HOLD ? '⏸' :
                       selectedCard.status === Status.NOT_STARTED ? '○' : '✓✓'}
                    </span>
                    <span>{selectedCard.status.replace(/_/g, " ")}</span>
                  </div>
                </div>

                {/* Two Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Priority */}
                  {selectedCard.priority && (
                    <div>
                      <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-2">
                        Priority
                      </p>
                      <span
                        className={`inline-block px-4 py-2 rounded-lg text-sm font-bold ${
                          selectedCard.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : selectedCard.priority === "medium"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {selectedCard.priority.toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Due Date */}
                  {selectedCard.dueDate && (
                    <div>
                      <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-2">
                        {t('end_date')}
                      </p>
                      <p className="text-gray-900 font-medium">
                        {new Date(selectedCard.dueDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedCard.dueDate.getTime() < Date.now() ? "Overdue" :
                         Math.ceil((selectedCard.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) + " days left"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Assignee */}
                {selectedCard.assignee && (
                  <div>
                    <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-2">
                      {t('assign_to')}
                    </p>
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {selectedCard.assignee.charAt(0)}
                      </div>
                      <p className="text-gray-900 font-medium">{selectedCard.assignee}</p>
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={() => setSelectedCard(null)}
                  className="w-full mt-4 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-lg transition-colors"
                >
                  Close Details
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
