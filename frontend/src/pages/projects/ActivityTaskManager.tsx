import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { projectService } from '../../services';
import Layout from '../../components/layout/Layout';
import { RoleGuard } from '../../components/common/RoleGuard';
import { FormField } from '../../components/forms/FormField';
import { Activity, Task, Status, TrackingStatus, Role, Priority, User } from '../../types';

interface ActivityFormData {
  name: string;
  description: string;
  priority: Priority;
}

interface TaskFormData {
  name: string;
  description: string;
  assigneeUserId?: number;
}

export const ActivityTaskManager: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const projectId = parseInt(id || '0', 10);

  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newActivityForm, setNewActivityForm] = useState<ActivityFormData>({
    name: '',
    description: '',
    priority: Priority.MEDIUM
  });
  const [newTaskForm, setNewTaskForm] = useState<TaskFormData & { activityId?: number }>({
    name: '',
    description: '',
    activityId: undefined
  });
  const [showNewActivityForm, setShowNewActivityForm] = useState(false);
  const [showNewTaskForm, setShowNewTaskForm] = useState<number | null>(null);
  const [expandedActivities, setExpandedActivities] = useState<Set<number>>(new Set());

  const {
    data: activities = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['project-activities', projectId],
    queryFn: () => projectService.getActivities(projectId),
    enabled: !!projectId
  });

  const {
    data: project
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId),
    enabled: !!projectId
  });

  const createActivityMutation = useMutation({
    mutationFn: (data: ActivityFormData) => projectService.createActivity(projectId, {
      ...data,
      projectId
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] });
      setNewActivityForm({ name: '', description: '', priority: Priority.MEDIUM });
      setShowNewActivityForm(false);
    }
  });

  const updateActivityMutation = useMutation({
    mutationFn: ({ activityId, data }: { activityId: number; data: Partial<Activity> }) =>
      projectService.updateActivity(projectId, activityId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] });
      setEditingActivity(null);
    }
  });

  const deleteActivityMutation = useMutation({
    mutationFn: (activityId: number) => projectService.deleteActivity(projectId, activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: ({ activityId, data }: { activityId: number; data: TaskFormData }) =>
      projectService.createTask(activityId, {
        name: data.name,
        description: data.description,
        activityId,
        assigneeUserId: data.assigneeUserId
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] });
      setNewTaskForm({ name: '', description: '', activityId: undefined });
      setShowNewTaskForm(null);
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ activityId, taskId, data }: { activityId: number; taskId: number; data: Partial<Task> }) =>
      projectService.updateTask(activityId, taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] });
      setEditingTask(null);
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: ({ activityId, taskId }: { activityId: number; taskId: number }) =>
      projectService.deleteTask(activityId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] });
    }
  });

  const getStatusColor = (status: Status) => {
    switch (status) {
      case Status.NOT_STARTED:
        return 'bg-gray-100 text-gray-800';
      case Status.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800';
      case Status.ON_HOLD:
        return 'bg-yellow-100 text-yellow-800';
      case Status.COMPLETED:
        return 'bg-green-100 text-green-800';
      case Status.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrackingStatusColor = (trackingStatus?: TrackingStatus) => {
    if (!trackingStatus) return 'bg-gray-100 text-gray-800';
    switch (trackingStatus) {
      case TrackingStatus.ON_TRACK:
        return 'bg-green-100 text-green-800';
      case TrackingStatus.AT_RISK:
        return 'bg-yellow-100 text-yellow-800';
      case TrackingStatus.DELAYED:
        return 'bg-red-100 text-red-800';
      case TrackingStatus.CRITICAL:
        return 'bg-red-200 text-red-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority?: Priority) => {
    if (!priority) return 'bg-gray-100 text-gray-800';
    switch (priority) {
      case Priority.CRITICAL:
        return 'bg-red-100 text-red-800';
      case Priority.HIGH:
        return 'bg-orange-100 text-orange-800';
      case Priority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800';
      case Priority.LOW:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleActivityExpansion = (activityId: number) => {
    const newExpanded = new Set(expandedActivities);
    if (newExpanded.has(activityId)) {
      newExpanded.delete(activityId);
    } else {
      newExpanded.add(activityId);
    }
    setExpandedActivities(newExpanded);
  };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    createActivityMutation.mutate(newActivityForm);
  };

  const handleUpdateActivity = (activity: Activity, field: string, value: any) => {
    updateActivityMutation.mutate({
      activityId: activity.id,
      data: { [field]: value }
    });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskForm.activityId) {
      createTaskMutation.mutate({
        activityId: newTaskForm.activityId,
        data: newTaskForm
      });
    }
  };

  const handleUpdateTask = (task: Task, field: string, value: any) => {
    updateTaskMutation.mutate({
      activityId: task.activity.id,
      taskId: task.id,
      data: { [field]: value }
    });
  };

  const renderActivityForm = (activity?: Activity, isEditing = false) => (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <input
            type="text"
            placeholder="Activity name"
            value={isEditing && activity ? activity.name : newActivityForm.name}
            onChange={(e) => {
              if (isEditing && activity) {
                handleUpdateActivity(activity, 'name', e.target.value);
              } else {
                setNewActivityForm(prev => ({ ...prev, name: e.target.value }));
              }
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
          <textarea
            placeholder="Activity description"
            rows={2}
            value={isEditing && activity ? (activity.description || '') : newActivityForm.description}
            onChange={(e) => {
              if (isEditing && activity) {
                handleUpdateActivity(activity, 'description', e.target.value);
              } else {
                setNewActivityForm(prev => ({ ...prev, description: e.target.value }));
              }
            }}
            className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
        <div>
          <select
            value={isEditing && activity ? (activity.priority || Priority.MEDIUM) : newActivityForm.priority}
            onChange={(e) => {
              if (isEditing && activity) {
                handleUpdateActivity(activity, 'priority', e.target.value as Priority);
              } else {
                setNewActivityForm(prev => ({ ...prev, priority: e.target.value as Priority }));
              }
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          >
            <option value={Priority.LOW}>Low Priority</option>
            <option value={Priority.MEDIUM}>Medium Priority</option>
            <option value={Priority.HIGH}>High Priority</option>
            <option value={Priority.CRITICAL}>Critical Priority</option>
          </select>
        </div>
      </div>
      
      {!isEditing && (
        <div className="mt-4 flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => setShowNewActivityForm(false)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateActivity}
            disabled={!newActivityForm.name.trim()}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Activity
          </button>
        </div>
      )}
    </div>
  );

  const renderTaskForm = (activityId: number) => (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 ml-8">
      <form onSubmit={handleCreateTask}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input
              type="text"
              placeholder="Task name"
              value={newTaskForm.name}
              onChange={(e) => setNewTaskForm(prev => ({ ...prev, name: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              required
            />
            <textarea
              placeholder="Task description"
              rows={2}
              value={newTaskForm.description}
              onChange={(e) => setNewTaskForm(prev => ({ ...prev, description: e.target.value }))}
              className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
          <div>
            <select
              value={newTaskForm.assigneeUserId || ''}
              onChange={(e) => setNewTaskForm(prev => ({ ...prev, assigneeUserId: e.target.value ? parseInt(e.target.value) : undefined }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="">Unassigned</option>
              {project?.teamMembers?.map(member => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </option>
              ))}
              {project?.projectManager && (
                <option value={project.projectManager.id}>
                  {project.projectManager.firstName} {project.projectManager.lastName} (PM)
                </option>
              )}
            </select>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => {
              setShowNewTaskForm(null);
              setNewTaskForm({ name: '', description: '', activityId: undefined });
            }}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!newTaskForm.name.trim()}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Task
          </button>
        </div>
      </form>
    </div>
  );

  const renderTask = (task: Task) => (
    <div key={task.id} className="ml-8 bg-white border-l-4 border-gray-200 pl-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              {editingTask?.id === task.id ? (
                <input
                  type="text"
                  value={editingTask.name}
                  onChange={(e) => setEditingTask(prev => prev ? { ...prev, name: e.target.value } : null)}
                  onBlur={() => {
                    if (editingTask && editingTask.name.trim() !== task.name) {
                      handleUpdateTask(task, 'name', editingTask.name);
                    } else {
                      setEditingTask(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                      setEditingTask(null);
                    }
                  }}
                  className="block w-full px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setEditingTask(task)}
                  className="text-left text-sm font-medium text-gray-900 hover:text-primary-600"
                >
                  {task.name}
                </button>
              )}
              {task.description && (
                <p className="text-sm text-gray-500 mt-1">{task.description}</p>
              )}
            </div>

            {/* Task Status */}
            <select
              value={task.status}
              onChange={(e) => handleUpdateTask(task, 'status', e.target.value as Status)}
              className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(task.status)}`}
            >
              <option value={Status.NOT_STARTED}>Not Started</option>
              <option value={Status.IN_PROGRESS}>In Progress</option>
              <option value={Status.ON_HOLD}>On Hold</option>
              <option value={Status.COMPLETED}>Completed</option>
              <option value={Status.CANCELLED}>Cancelled</option>
            </select>

            {/* Task Assignee */}
            <div className="flex items-center text-sm text-gray-500">
              {task.assigneeUser ? (
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center mr-2">
                    <span className="text-xs font-medium text-white">
                      {task.assigneeUser.firstName[0]}{task.assigneeUser.lastName[0]}
                    </span>
                  </div>
                  <span>{task.assigneeUser.firstName} {task.assigneeUser.lastName}</span>
                </div>
              ) : (
                <span>Unassigned</span>
              )}
            </div>

            {/* Progress */}
            <div className="flex items-center space-x-2">
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${task.percentageComplete}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500 w-8">{task.percentageComplete}%</span>
            </div>
          </div>
        </div>

        {/* Task Actions */}
        <RoleGuard allowedRoles={[Role.PMO, Role.PM]}>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => deleteTaskMutation.mutate({ activityId: task.activity.id, taskId: task.id })}
              className="text-red-600 hover:text-red-900"
              title="Delete task"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </RoleGuard>
      </div>
    </div>
  );

  const renderActivity = (activity: Activity) => {
    const isExpanded = expandedActivities.has(activity.id);
    const taskCount = activity.tasks?.length || 0;
    const completedTasks = activity.tasks?.filter(task => task.status === Status.COMPLETED).length || 0;

    return (
      <div key={activity.id} className="bg-white shadow rounded-lg mb-4">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <button
                onClick={() => toggleActivityExpansion(activity.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  {editingActivity?.id === activity.id ? (
                    <input
                      type="text"
                      value={editingActivity.name}
                      onChange={(e) => setEditingActivity(prev => prev ? { ...prev, name: e.target.value } : null)}
                      onBlur={() => {
                        if (editingActivity && editingActivity.name.trim() !== activity.name) {
                          handleUpdateActivity(activity, 'name', editingActivity.name);
                        } else {
                          setEditingActivity(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        } else if (e.key === 'Escape') {
                          setEditingActivity(null);
                        }
                      }}
                      className="block w-full px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setEditingActivity(activity)}
                      className="text-left text-lg font-medium text-gray-900 hover:text-primary-600"
                    >
                      {activity.name}
                    </button>
                  )}

                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                    {activity.status.replace('_', ' ')}
                  </span>

                  {activity.trackingStatus && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTrackingStatusColor(activity.trackingStatus)}`}>
                      {activity.trackingStatus.replace('_', ' ')}
                    </span>
                  )}

                  {activity.priority && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(activity.priority)}`}>
                      {activity.priority}
                    </span>
                  )}
                </div>

                {activity.description && (
                  <p className="mt-1 text-sm text-gray-500">{activity.description}</p>
                )}

                <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                  <span>{taskCount} tasks</span>
                  <span>{completedTasks} completed</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${activity.percentageComplete}%` }}
                      ></div>
                    </div>
                    <span>{activity.percentageComplete}%</span>
                  </div>
                </div>
              </div>
            </div>

            <RoleGuard allowedRoles={[Role.PMO, Role.PM]}>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setNewTaskForm(prev => ({ ...prev, activityId: activity.id }));
                    setShowNewTaskForm(activity.id);
                  }}
                  className="text-primary-600 hover:text-primary-900"
                  title="Add task"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteActivityMutation.mutate(activity.id)}
                  className="text-red-600 hover:text-red-900"
                  title="Delete activity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </RoleGuard>
          </div>
        </div>

        {/* Tasks */}
        {isExpanded && (
          <div className="border-t border-gray-200">
            <div className="px-4 py-4">
              {activity.tasks && activity.tasks.length > 0 ? (
                <div className="space-y-2">
                  {activity.tasks.map(task => renderTask(task))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new task.</p>
                </div>
              )}

              {showNewTaskForm === activity.id && renderTaskForm(activity.id)}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load activities</h3>
            <p className="text-gray-500 mb-4">There was an error loading the project activities.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Activities & Tasks
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage project activities and their associated tasks
            </p>
          </div>
          <RoleGuard allowedRoles={[Role.PMO, Role.PM]}>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <button
                onClick={() => setShowNewActivityForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Activity
              </button>
            </div>
          </RoleGuard>
        </div>

        {/* New Activity Form */}
        {showNewActivityForm && (
          <div className="mb-6">
            {renderActivityForm()}
          </div>
        )}

        {/* Activities List */}
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map(activity => renderActivity(activity))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No activities</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first activity.
            </p>
            <RoleGuard allowedRoles={[Role.PMO, Role.PM]}>
              <div className="mt-6">
                <button
                  onClick={() => setShowNewActivityForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Activity
                </button>
              </div>
            </RoleGuard>
          </div>
        )}
      </div>
    </Layout>
  );
};