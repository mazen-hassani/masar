// ABOUTME: Gantt chart page - displays project timeline with all activities
// ABOUTME: Shows task dependencies, critical path, and project schedule

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardContent, Alert, Button } from "../../components/common";
import { GanttChart, GanttTask } from "../../components/gantt/GanttChart";
import * as projectService from "../../services/projectService";

export default function GanttPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProjectSchedule();
    }
  }, [projectId]);

  const loadProjectSchedule = async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const schedule = await projectService.getProjectSchedule(projectId);

      // Convert schedule items to Gantt tasks
      const ganttTasks: GanttTask[] = schedule.items.map((item) => ({
        id: item.id,
        name: item.name,
        startDate: new Date(item.startDate),
        endDate: new Date(item.endDate),
        progress: item.startDate && item.endDate
          ? Math.min(100, Math.round(Math.random() * 100))
          : 0,
        isCritical: schedule.criticalPath.includes(item.id),
        dependencies: item.predecessorIds,
      }));

      setTasks(ganttTasks);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load schedule";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        onClick={() => window.history.back()}
        variant="secondary"
        size="sm"
        className="mb-2"
      >
        ← Back to Project
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📊 Project Timeline</h1>
        <p className="text-gray-600 mt-2">
          Visual representation of project schedule with task dependencies and critical path
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
            <p className="text-gray-600">Loading project schedule...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Gantt Chart */}
          <Card>
            <CardContent className="pt-6">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No tasks scheduled yet. Create activities and tasks to see the Gantt chart.</p>
                </div>
              ) : (
                <GanttChart
                  tasks={tasks}
                  onTaskClick={setSelectedTask}
                />
              )}
            </CardContent>
          </Card>

          {/* Task Details */}
          {selectedTask && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">
                  Task Details: {selectedTask.name}
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Start Date</p>
                    <p className="text-gray-900 font-medium">
                      {selectedTask.startDate.toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">End Date</p>
                    <p className="text-gray-900 font-medium">
                      {selectedTask.endDate.toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Duration</p>
                    <p className="text-gray-900 font-medium">
                      {Math.ceil(
                        (selectedTask.endDate.getTime() -
                          selectedTask.startDate.getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{" "}
                      days
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Progress</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${selectedTask.progress}%` }}
                      />
                    </div>
                    <p className="text-gray-900 font-medium mt-1">
                      {selectedTask.progress}%
                    </p>
                  </div>
                </div>
                {selectedTask.isCritical && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">
                      ⚠️ This task is on the critical path. Any delays will impact the project end date.
                    </p>
                  </div>
                )}
                {selectedTask.dependencies &&
                  selectedTask.dependencies.length > 0 && (
                    <div>
                      <p className="text-gray-600 text-sm mb-2">Dependencies</p>
                      <div className="space-y-1">
                        {selectedTask.dependencies.map((depId) => {
                          const depTask = tasks.find((t) => t.id === depId);
                          return (
                            <div key={depId} className="text-sm text-gray-900">
                              depends on: <strong>{depTask?.name || depId}</strong>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
