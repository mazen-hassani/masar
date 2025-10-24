// ABOUTME: Activity card component - displays activity with expandable task list
// ABOUTME: Shows activity status, progress, dates, and inline task management

import React, { useState } from "react";
import { Activity, Task } from "../../types";
import { StatusBadge, ProgressBar, Button } from "./index";

interface ActivityCardProps {
  activity: Activity;
  tasks?: Task[];
  onEdit?: (activity: Activity) => void;
  onDelete?: (activityId: string) => void;
  onViewTasks?: (activityId: string) => void;
  onTaskClick?: (task: Task) => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  tasks = [],
  onEdit,
  onDelete,
  onViewTasks,
  onTaskClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const progress = activity.progressPercentage || 0;
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED" || t.status === "VERIFIED").length;

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this activity?")) {
      onDelete?.(activity.id);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg transition-all duration-200 hover:shadow-md">
      {/* Activity Header */}
      <div className="px-6 py-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`inline-block transform transition-transform duration-200 ${
                  isExpanded ? "rotate-90" : ""
                } text-gray-400`}
              >
                ▶
              </span>
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {activity.name}
              </h3>
              <StatusBadge status={activity.status || "NOT_STARTED"} size="sm" />
            </div>
            {activity.description && (
              <p className="text-gray-600 text-sm ml-7 line-clamp-1">
                {activity.description}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex-shrink-0 text-right">
            <p className="text-2xl font-bold text-gray-900">{progress}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {completedTasks}/{tasks.length} tasks
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 ml-7">
          <ProgressBar progress={progress} size="sm" color="green" />
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 space-y-3">
          {/* Activity Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-gray-200">
            {activity.startDate && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Start</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(activity.startDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {activity.endDate && (
              <div>
                <p className="text-xs text-gray-500 mb-1">End</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(activity.endDate).toLocaleDateString()}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <StatusBadge status={activity.status || "NOT_STARTED"} size="sm" />
            </div>
          </div>

          {/* Tasks List */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Tasks ({tasks.length})</h4>
            {tasks.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No tasks yet</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white rounded border border-gray-300 p-3 flex items-start gap-3 hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => onTaskClick?.(task)}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={task.status === "COMPLETED" || task.status === "VERIFIED"}
                        onChange={() => {}}
                        className="w-4 h-4 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {task.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{task.description || "No description"}</p>
                    </div>
                    <StatusBadge status={task.status || "NOT_STARTED"} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-gray-200">
            {onViewTasks && (
              <Button
                onClick={() => onViewTasks(activity.id)}
                variant="primary"
                size="sm"
                className="flex-1"
              >
                Manage Tasks
              </Button>
            )}
            {onEdit && (
              <Button
                onClick={() => onEdit(activity)}
                variant="secondary"
                size="sm"
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                onClick={handleDelete}
                variant="danger"
                size="sm"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
