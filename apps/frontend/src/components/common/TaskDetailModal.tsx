// ABOUTME: Task detail modal component - displays and allows editing task information
// ABOUTME: Shows task details with status, progress, dates, assignee, and description

import React, { useState } from "react";
import { Task, Status } from "../../types";
import { Button, Modal, StatusBadge, ProgressBar } from "./index";

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStatus, setNewStatus] = useState<Status | null>(null);

  if (!task) return null;

  const statusOptions: Status[] = [
    Status.NOT_STARTED,
    Status.IN_PROGRESS,
    Status.ON_HOLD,
    Status.COMPLETED,
    Status.VERIFIED,
  ];

  const handleStatusChange = async (status: Status) => {
    if (!onUpdate) return;
    setIsSubmitting(true);
    try {
      await onUpdate(task.id, { status });
      setNewStatus(status);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !window.confirm("Are you sure you want to delete this task?")) return;
    setIsSubmitting(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStatus = newStatus || task.status;
  const daysUntilDue = task.endDate
    ? Math.ceil((new Date(task.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Task Details" size="md">
      <div className="space-y-6">
        {/* Task Title */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{task.name}</h2>
          {task.description && (
            <p className="text-gray-600 text-sm">{task.description}</p>
          )}
        </div>

        {/* Status Section */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Status</p>
          <div className="flex items-center gap-2 mb-3">
            <StatusBadge status={currentStatus} size="md" />
          </div>
          {isEditing && (
            <div className="space-y-2">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={isSubmitting}
                  className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                    currentStatus === status
                      ? "bg-blue-50 border-blue-300 text-blue-900"
                      : "bg-white border-gray-200 text-gray-900 hover:border-gray-300"
                  } disabled:opacity-50`}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Progress Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">Progress</p>
            <span className="text-sm font-bold text-gray-900">{task.progressPercentage}%</span>
          </div>
          <ProgressBar progress={task.progressPercentage} size="md" color="blue" />
        </div>

        {/* Key Details Grid */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          {/* Start Date */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Start Date</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(task.startDate).toLocaleDateString()}
            </p>
          </div>

          {/* End Date */}
          <div>
            <p className="text-xs text-gray-500 mb-1">End Date</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(task.endDate).toLocaleDateString()}
            </p>
          </div>

          {/* Duration */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Duration</p>
            <p className="text-sm font-medium text-gray-900">{task.duration}h</p>
          </div>

          {/* Days Until Due */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Days Until Due</p>
            {daysUntilDue !== null ? (
              <p
                className={`text-sm font-medium ${
                  daysUntilDue < 0
                    ? "text-red-600"
                    : daysUntilDue === 0
                    ? "text-orange-600"
                    : "text-green-600"
                }`}
              >
                {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} overdue` : `${daysUntilDue} days`}
              </p>
            ) : (
              <p className="text-sm font-medium text-gray-500">N/A</p>
            )}
          </div>
        </div>

        {/* Assignee */}
        {task.assignee && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Assigned To</p>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <span className="text-2xl">👤</span>
              <div>
                <p className="font-medium text-gray-900">
                  {task.assignee.firstName} {task.assignee.lastName}
                </p>
                <p className="text-sm text-gray-600">{task.assignee.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "secondary" : "primary"}
            size="sm"
            className="flex-1"
          >
            {isEditing ? "Done Editing" : "Edit"}
          </Button>
          {onDelete && (
            <Button
              onClick={handleDelete}
              variant="danger"
              size="sm"
              disabled={isSubmitting}
            >
              Delete
            </Button>
          )}
          <Button onClick={onClose} variant="secondary" size="sm" className="flex-1">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
