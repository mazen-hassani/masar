import React, { useState, useEffect, useMemo, useCallback } from 'react';
import FrappeGantt from 'react-frappe-gantt';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  UsersIcon, 
  ExclamationTriangleIcon, 
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  BellIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { Activity, Project, Task as TaskType, Status, Priority } from '../../types';
import { GanttValidation, ValidationSummary, useTaskValidation } from './GanttValidation';
import { DependencyVisualization, DependencyLegend } from './DependencyVisualization';
import { DependencyManager, DependencyType } from './DependencyManager';
import { BaselineManager, BaselineSnapshot } from './BaselineManager';
import { BaselineComparison } from './BaselineComparison';
import {
  useCollaborativeFeatures,
  UserPresence,
  NotificationPanel,
  ConflictDialog,
  CollaborativeUser
} from './CollaborativeFeatures';

interface GanttTask {
  id: string | number;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies?: string;
  custom_class?: string;
}

interface InteractiveGanttChartProps {
  project: Project;
  activities: Activity[];
  tasks: TaskType[];
  onTaskUpdate?: (taskId: string, updates: Partial<TaskType>) => void;
  onDependencyCreate?: (fromTaskId: string, toTaskId: string) => void;
  viewMode?: string;
  readonly?: boolean;
  currentUser?: CollaborativeUser;
  enableCollaboration?: boolean;
}

interface TaskWithDuration extends TaskType {
  duration: number;
  calculatedStartDate: Date;
  calculatedEndDate: Date;
}

export const InteractiveGanttChart: React.FC<InteractiveGanttChartProps> = ({
  project,
  activities,
  tasks,
  onTaskUpdate,
  onDependencyCreate,
  viewMode = 'Day',
  readonly = false,
  currentUser = {
    id: 'current-user',
    name: 'Current User',
    email: 'user@example.com',
    role: 'editor',
    isOnline: true
  },
  enableCollaboration = true
}) => {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [ganttTasks, setGanttTasks] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<any>(null);
  const [validationEnabled, setValidationEnabled] = useState(true);
  const [autoSave, setAutoSave] = useState(false);
  const [showDependencies, setShowDependencies] = useState(true);
  const [showDependencyManager, setShowDependencyManager] = useState(false);
  const [showDependencyLegend, setShowDependencyLegend] = useState(false);
  const [hoveredDependency, setHoveredDependency] = useState<string | null>(null);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [showBaselineManager, setShowBaselineManager] = useState(false);
  const [showBaselineComparison, setShowBaselineComparison] = useState(false);
  const [baselines, setBaselines] = useState<BaselineSnapshot[]>([]);
  const [activeBaseline, setActiveBaseline] = useState<BaselineSnapshot | undefined>(undefined);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [activeConflict, setActiveConflict] = useState<any>(null);
  const ganttContainerRef = React.useRef<HTMLDivElement>(null);
  
  const { validateTaskChange } = useTaskValidation();
  
  // Initialize collaborative features
  const {
    collaborativeUsers,
    taskLocks,
    notifications,
    conflicts,
    isConnected,
    lockTask,
    unlockTask,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    resolveConflict,
    dismissConflict
  } = useCollaborativeFeatures({
    projectId: project.id.toString(),
    currentUser,
    onUserPresenceUpdate: (users) => {
      // Handle user presence updates
      console.log('User presence updated:', users);
    },
    onTaskLock: (taskId, locked) => {
      // Handle task locking
      console.log(`Task ${taskId} ${locked ? 'locked' : 'unlocked'}`);
    },
    onConflictResolved: (conflictId, resolution) => {
      // Handle conflict resolution
      console.log('Conflict resolved:', conflictId, resolution);
    }
  });

  // Convert project tasks to Gantt format with enhanced data processing
  const processedTasks = useMemo(() => {
    const tasksWithDuration: TaskWithDuration[] = tasks.map(task => {
      const activity = activities.find(a => a.id === (task as any).activityId);
      const defaultDuration = (activity as any)?.estimatedDuration || 1;
      const startDate = new Date(task.createdAt);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + defaultDuration);

      return {
        ...task,
        duration: defaultDuration,
        calculatedStartDate: startDate,
        calculatedEndDate: (task as any).completedAt ? new Date((task as any).completedAt) : endDate
      };
    });

    return tasksWithDuration;
  }, [tasks, activities]);

  // Transform tasks to Gantt format
  useEffect(() => {
    const ganttData: GanttTask[] = processedTasks.map(task => {
      const activity = activities.find(a => a.id === (task as any).activityId);
      let customClass = '';
      
      // Apply custom styling based on task properties
      if ((task as any).status === 'completed') {
        customClass = 'gantt-completed';
      } else if ((task as any).status === 'in_progress') {
        customClass = 'gantt-in-progress';
      } else if ((task as any).priority === 'high') {
        customClass = 'gantt-high-priority';
      } else if ((task as any).priority === 'medium') {
        customClass = 'gantt-medium-priority';
      } else {
        customClass = 'gantt-low-priority';
      }

      // Check if task is overdue
      const now = new Date();
      if ((task as any).status !== 'completed' && task.calculatedEndDate < now) {
        customClass += ' gantt-overdue';
      }

      return {
        id: task.id,
        name: `${activity?.name || 'Unknown Activity'} - ${(task as any).title}`,
        start: task.calculatedStartDate.toISOString().split('T')[0],
        end: task.calculatedEndDate.toISOString().split('T')[0],
        progress: (task as any).status === 'completed' ? 100 : 
                 (task as any).status === 'in_progress' ? 50 : 0,
        custom_class: customClass,
        dependencies: (task as any).dependencies?.join(',') || ''
      };
    });

    setGanttTasks(ganttData);
  }, [processedTasks, activities]);

  // Handle task interactions
  const handleTaskClick = (task: any) => {
    setSelectedTask(task.id.toString());
  };

  const handleTaskDateChange = useCallback((task: any) => {
    if (readonly || !onTaskUpdate) return;

    const taskToUpdate = tasks.find(t => t.id.toString() === task.id.toString());
    if (!taskToUpdate) return;

    const newStartDate = new Date(task.start);
    const newEndDate = new Date(task.end);
    const dependencies = (taskToUpdate as any).dependencies || [];
    const assigneeId = (taskToUpdate as any).assigneeId;

    // Store pending changes
    const changes = {
      taskId: task.id,
      startDate: newStartDate,
      endDate: newEndDate,
      originalTask: taskToUpdate
    };
    setPendingChanges(changes);

    if (validationEnabled) {
      // Run validation
      const results = validateTaskChange(
        task.id,
        newStartDate,
        newEndDate,
        dependencies,
        processedTasks,
        assigneeId
      );

      setValidationResults(results);
      setShowValidation(results.length > 0);

      // Auto-save if no errors and auto-save is enabled
      const hasErrors = results.some(r => r.severity === 'error');
      if (autoSave && !hasErrors) {
        applyTaskChanges(changes);
      }
    } else {
      // Apply changes immediately if validation is disabled
      applyTaskChanges(changes);
    }
  }, [readonly, onTaskUpdate, tasks, validationEnabled, autoSave, validateTaskChange, processedTasks, lockTask, taskLocks, enableCollaboration]);

  const applyTaskChanges = useCallback((changes: any) => {
    if (onTaskUpdate) {
      onTaskUpdate(changes.taskId, {
        startDate: changes.startDate.toISOString(),
        endDate: changes.endDate.toISOString(),
        updatedAt: new Date().toISOString()
      } as any);
    }
    
    // Add collaborative notification
    if (enableCollaboration) {
      addNotification({
        type: 'task_updated',
        userId: currentUser.id,
        userName: currentUser.name,
        data: {
          taskId: changes.taskId,
          taskName: changes.originalTask.title || 'Unknown Task',
          fieldChanged: 'schedule',
          oldValue: changes.originalTask.startDate,
          newValue: changes.startDate.toISOString()
        }
      });
      
      // Unlock the task
      unlockTask(changes.taskId);
    }
    
    setPendingChanges(null);
    setValidationResults([]);
    setShowValidation(false);
  }, [onTaskUpdate, enableCollaboration, addNotification, currentUser, unlockTask]);

  const revertTaskChanges = useCallback(() => {
    // Revert to original task data - this would typically refresh the Gantt
    setPendingChanges(null);
    setValidationResults([]);
    setShowValidation(false);
    // Force re-render of Gantt with original data
    window.location.reload(); // Simple approach - in production you'd want better state management
  }, []);

  const handleValidationDismiss = useCallback((index: number) => {
    const newResults = validationResults.filter((_, i) => i !== index);
    setValidationResults(newResults);
    if (newResults.length === 0) {
      setShowValidation(false);
    }
  }, [validationResults]);

  const handleValidationAccept = useCallback((result: any) => {
    if (pendingChanges) {
      applyTaskChanges(pendingChanges);
    }
  }, [pendingChanges, applyTaskChanges]);

  const toggleValidation = useCallback(() => {
    setValidationEnabled(!validationEnabled);
    if (!validationEnabled) {
      setValidationResults([]);
      setShowValidation(false);
    }
  }, [validationEnabled]);

  const toggleAutoSave = useCallback(() => {
    setAutoSave(!autoSave);
  }, [autoSave]);

  // Generate dependencies from task data
  useEffect(() => {
    const generatedDependencies = tasks
      .filter(task => (task as any).dependencies && (task as any).dependencies.length > 0)
      .flatMap(task => 
        (task as any).dependencies.map((depId: string | number, index: number) => ({
          id: `${task.id}-${depId}-${index}`,
          predecessorId: depId,
          successorId: task.id,
          type: DependencyType.FS,
          lag: 0,
          isHighlighted: selectedTask === task.id.toString() || hoveredDependency === `${task.id}-${depId}-${index}`,
          isConflicted: false
        }))
      );
    
    setDependencies(generatedDependencies);
  }, [tasks, selectedTask, hoveredDependency]);

  // Dependency management handlers
  const handleAddDependency = useCallback((newDep: any) => {
    const dependencyId = `${Date.now()}-${Math.random()}`;
    const dependency = {
      ...newDep,
      id: dependencyId
    };
    
    setDependencies(prev => [...prev, dependency]);
    
    // Notify parent component if callback provided
    if (onDependencyCreate) {
      onDependencyCreate(newDep.predecessorId, newDep.successorId);
    }
  }, [onDependencyCreate]);

  const handleRemoveDependency = useCallback((dependencyId: string) => {
    setDependencies(prev => prev.filter(dep => dep.id !== dependencyId));
  }, []);

  const handleUpdateDependency = useCallback((dependencyId: string, updates: any) => {
    setDependencies(prev => prev.map(dep => 
      dep.id === dependencyId ? { ...dep, ...updates } : dep
    ));
  }, []);

  const handleDependencyClick = useCallback((dependencyId: string) => {
    const dependency = dependencies.find(dep => dep.id === dependencyId);
    if (dependency) {
      setSelectedTask(dependency.successorId.toString());
    }
  }, [dependencies]);

  const handleDependencyHover = useCallback((dependencyId: string | null) => {
    setHoveredDependency(dependencyId);
  }, []);

  const toggleDependencyVisualization = useCallback(() => {
    setShowDependencies(!showDependencies);
  }, [showDependencies]);

  // Baseline management handlers
  const handleCreateBaseline = useCallback((baseline: Omit<BaselineSnapshot, 'id' | 'createdDate'>) => {
    const newBaseline: BaselineSnapshot = {
      ...baseline,
      id: `baseline-${Date.now()}`,
      createdDate: new Date()
    };
    
    setBaselines(prev => {
      const updated = [...prev, newBaseline];
      if (newBaseline.isActive || updated.length === 1) {
        // Set as active if marked as active or if it's the first baseline
        const newActive = updated.map(b => ({ ...b, isActive: b.id === newBaseline.id }));
        setActiveBaseline(newBaseline);
        return newActive;
      }
      return updated;
    });
  }, []);

  const handleSetActiveBaseline = useCallback((baselineId: string) => {
    setBaselines(prev => prev.map(b => ({ ...b, isActive: b.id === baselineId })));
    const baseline = baselines.find(b => b.id === baselineId);
    if (baseline) {
      setActiveBaseline({ ...baseline, isActive: true });
    }
  }, [baselines]);

  const handleDeleteBaseline = useCallback((baselineId: string) => {
    setBaselines(prev => {
      const filtered = prev.filter(b => b.id !== baselineId);
      if (activeBaseline?.id === baselineId) {
        const newActive = filtered.find(b => b.isActive) || filtered[0];
        setActiveBaseline(newActive);
      }
      return filtered;
    });
  }, [activeBaseline]);

  const handleUpdateBaseline = useCallback((baseline: BaselineSnapshot) => {
    setBaselines(prev => prev.map(b => b.id === baseline.id ? baseline : b));
    if (activeBaseline?.id === baseline.id) {
      setActiveBaseline(baseline);
    }
  }, [activeBaseline]);
  
  // Handle conflicts
  useEffect(() => {
    if (conflicts.length > 0 && !activeConflict) {
      setActiveConflict(conflicts[0]);
      setShowConflictDialog(true);
    }
  }, [conflicts, activeConflict]);
  
  // Notification handlers
  const handleNotificationToggle = useCallback(() => {
    setShowNotifications(!showNotifications);
  }, [showNotifications]);
  
  const handleConflictResolve = useCallback((conflictId: string, selectedUserId: string) => {
    resolveConflict(conflictId, selectedUserId);
    setShowConflictDialog(false);
    setActiveConflict(null);
  }, [resolveConflict]);
  
  const handleConflictDismiss = useCallback((conflictId: string) => {
    dismissConflict(conflictId);
    setShowConflictDialog(false);
    setActiveConflict(null);
  }, [dismissConflict]);
  
  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  const handleTaskProgressChange = (task: any) => {
    if (readonly || !onTaskUpdate) return;

    const taskToUpdate = tasks.find(t => t.id === task.id);
    if (taskToUpdate) {
      let newStatus = (taskToUpdate as any).status;
      
      if (task.progress === 100) {
        newStatus = 'completed';
      } else if (task.progress > 0) {
        newStatus = 'in_progress';
      } else {
        newStatus = 'pending';
      }

      onTaskUpdate(task.id, {
        status: newStatus as any,
        completedAt: task.progress === 100 ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString()
      } as any);
    }
  };

  // Calculate project statistics
  const projectStats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => (t as any).status === 'completed').length;
    const inProgressTasks = tasks.filter(t => (t as any).status === 'in_progress').length;
    const overdueTasks = tasks.filter(t => {
      const taskWithDuration = processedTasks.find(pt => pt.id === t.id);
      return taskWithDuration && (t as any).status !== 'completed' && taskWithDuration.calculatedEndDate < new Date();
    }).length;

    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      completionPercentage
    };
  }, [tasks, processedTasks]);

  // Get selected task details
  const selectedTaskDetails = useMemo(() => {
    if (!selectedTask) return null;
    const task = tasks.find(t => t.id.toString() === selectedTask);
    const activity = task ? activities.find(a => a.id === (task as any).activityId) : null;
    const taskWithDuration = processedTasks.find(t => t.id.toString() === selectedTask);
    
    return task && activity && taskWithDuration ? {
      task,
      activity,
      duration: taskWithDuration.duration,
      startDate: taskWithDuration.calculatedStartDate,
      endDate: taskWithDuration.calculatedEndDate
    } : null;
  }, [selectedTask, tasks, activities, processedTasks]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{project.name} - Gantt Chart</h2>
            <p className="text-gray-600">{project.description}</p>
          </div>
          <div className="flex items-center space-x-6">
            {/* Collaborative Features */}
            {enableCollaboration && (
              <div className="flex items-center space-x-4 border-r border-gray-200 pr-4">
                <UserPresence 
                  users={collaborativeUsers}
                  currentUser={currentUser}
                  maxVisible={3}
                />
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleNotificationToggle}
                    className={`p-2 rounded transition-colors relative ${
                      unreadNotificationCount > 0 
                        ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title="Notifications"
                  >
                    <BellIcon className="h-5 w-5" />
                    {unreadNotificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadNotificationCount}
                      </span>
                    )}
                  </button>
                  
                  <div className={`flex items-center text-xs ${
                    isConnected ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-1 ${
                      isConnected ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                    {isConnected ? 'Connected' : 'Offline'}
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-sm text-gray-500">
              View Mode: <span className="font-medium text-gray-700">{viewMode}</span>
            </div>
            
            {/* Validation Status */}
            <ValidationSummary 
              validationResults={validationResults} 
              className="hidden sm:flex"
            />
            
            {/* Controls */}
            <div className="flex items-center space-x-4">
              {/* Validation Controls */}
              <div className="flex items-center space-x-3 border-r border-gray-200 pr-4">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={validationEnabled}
                    onChange={toggleValidation}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Validation</span>
                </label>
                
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={toggleAutoSave}
                    disabled={!validationEnabled}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-gray-700">Auto-save</span>
                </label>
              </div>

              {/* Dependency Controls */}
              <div className="flex items-center space-x-3 border-r border-gray-200 pr-4">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showDependencies}
                    onChange={toggleDependencyVisualization}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-gray-700">Dependencies ({dependencies.length})</span>
                </label>
                
                <button
                  onClick={() => setShowDependencyManager(true)}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  title="Manage dependencies"
                >
                  Manage
                </button>
                
                <button
                  onClick={() => setShowDependencyLegend(!showDependencyLegend)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  title="Show dependency legend"
                >
                  Legend
                </button>
              </div>

              {/* Baseline Controls */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowBaselineManager(true)}
                  className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors flex items-center space-x-1"
                  title="Manage project baselines"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" />
                  <span>Baselines ({baselines.length})</span>
                </button>
                
                {activeBaseline && (
                  <button
                    onClick={() => setShowBaselineComparison(!showBaselineComparison)}
                    className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors flex items-center space-x-1"
                    title="Compare with baseline"
                  >
                    <ChartBarIcon className="h-4 w-4" />
                    <span>Compare</span>
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 border-l border-gray-200 pl-4">
                <button
                  onClick={() => setShowValidation(!showValidation)}
                  className={`p-2 rounded transition-colors ${
                    validationResults.length > 0 
                      ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                      : 'text-gray-400'
                  }`}
                  disabled={validationResults.length === 0}
                  title="Show validation details"
                >
                  <Cog6ToothIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Project Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <CalendarDaysIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm text-blue-600">Total Tasks</p>
                <p className="text-2xl font-bold text-blue-900">{projectStats.totalTasks}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm text-green-600">Completed</p>
                <p className="text-2xl font-bold text-green-900">{projectStats.completedTasks}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-yellow-500" />
              <div className="ml-3">
                <p className="text-sm text-yellow-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-900">{projectStats.inProgressTasks}</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm text-red-600">Overdue</p>
                <p className="text-2xl font-bold text-red-900">{projectStats.overdueTasks}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Project Progress</span>
            <span className="text-sm text-gray-500">{projectStats.completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${projectStats.completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Dependency Legend */}
      {showDependencyLegend && (
        <div className="mb-4">
          <DependencyLegend showTypes={true} />
        </div>
      )}

      {/* Gantt Chart Container */}
      <div className="border rounded-lg overflow-hidden mb-6 relative">
        {ganttTasks.length > 0 ? (
          <div ref={ganttContainerRef} className="gantt-container relative">
            <style dangerouslySetInnerHTML={{
              __html: `
                .gantt-container .gantt-completed .bar {
                  fill: #10b981 !important;
                }
                .gantt-container .gantt-in-progress .bar {
                  fill: #f59e0b !important;
                }
                .gantt-container .gantt-high-priority .bar {
                  fill: #ef4444 !important;
                }
                .gantt-container .gantt-medium-priority .bar {
                  fill: #3b82f6 !important;
                }
                .gantt-container .gantt-low-priority .bar {
                  fill: #6b7280 !important;
                }
                .gantt-container .gantt-overdue .bar {
                  fill: #dc2626 !important;
                  stroke: #b91c1c !important;
                  stroke-width: 2px !important;
                }
                .gantt-container .gantt .grid-row {
                  fill: none;
                  stroke: #e5e7eb;
                  stroke-width: 1;
                }
                .gantt-container .gantt .row-line {
                  fill: none;
                  stroke: #f3f4f6;
                  stroke-width: 1;
                }
              `
            }} />
            <FrappeGantt
              tasks={ganttTasks}
              viewMode={viewMode}
              onClick={handleTaskClick}
              onDateChange={handleTaskDateChange}
              onProgressChange={handleTaskProgressChange}
              columnWidth={200}
              barHeight={20}
              padding={18}
            />
            
            {/* Dependency Visualization Overlay */}
            <DependencyVisualization
              dependencies={dependencies}
              ganttContainerRef={ganttContainerRef}
              selectedTaskId={selectedTask || undefined}
              onDependencyClick={handleDependencyClick}
              onDependencyHover={handleDependencyHover}
              isVisible={showDependencies}
            />
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <CalendarDaysIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No tasks to display in Gantt chart</p>
            <p className="text-sm">Add activities and tasks to see the timeline visualization</p>
          </div>
        )}
      </div>

      {/* Baseline Comparison Panel */}
      {showBaselineComparison && activeBaseline && (
        <div className="mb-6">
          <BaselineComparison
            currentTasks={processedTasks}
            activeBaseline={activeBaseline}
          />
        </div>
      )}

      {/* Task Details Panel */}
      {selectedTaskDetails && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Task Information</h4>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Title:</span> {(selectedTaskDetails.task as any).title}</p>
                <p><span className="font-medium">Activity:</span> {selectedTaskDetails.activity.name}</p>
                <p><span className="font-medium">Status:</span> 
                  <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                    (selectedTaskDetails.task as any).status === 'completed' ? 'bg-green-100 text-green-800' :
                    (selectedTaskDetails.task as any).status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {(selectedTaskDetails.task as any).status.replace('_', ' ').toUpperCase()}
                  </span>
                </p>
                <p><span className="font-medium">Priority:</span> 
                  <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                    (selectedTaskDetails.task as any).priority === 'high' ? 'bg-red-100 text-red-800' :
                    (selectedTaskDetails.task as any).priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {(selectedTaskDetails.task as any).priority.toUpperCase()}
                  </span>
                </p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Timeline</h4>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Start Date:</span> {selectedTaskDetails.startDate.toLocaleDateString()}</p>
                <p><span className="font-medium">End Date:</span> {selectedTaskDetails.endDate.toLocaleDateString()}</p>
                <p><span className="font-medium">Duration:</span> {selectedTaskDetails.duration} days</p>
                {(selectedTaskDetails.task as any).assigneeId && (
                  <p><span className="font-medium">Assigned to:</span> User {(selectedTaskDetails.task as any).assigneeId}</p>
                )}
              </div>
            </div>
          </div>
          
          {(selectedTaskDetails.task as any).description && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">Description</h4>
              <p className="text-sm text-gray-600">{(selectedTaskDetails.task as any).description}</p>
            </div>
          )}
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setSelectedTask(null)}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
      
      {/* Validation Panel */}
      <GanttValidation
        validationResults={validationResults}
        onDismiss={handleValidationDismiss}
        onAccept={handleValidationAccept}
        onRevert={revertTaskChanges}
        isVisible={showValidation}
      />
      
      {/* Dependency Manager Modal */}
      <DependencyManager
        tasks={tasks}
        dependencies={dependencies}
        onAddDependency={handleAddDependency}
        onRemoveDependency={handleRemoveDependency}
        onUpdateDependency={handleUpdateDependency}
        isVisible={showDependencyManager}
        onClose={() => setShowDependencyManager(false)}
        selectedTaskId={selectedTask || undefined}
      />
      
      {/* Baseline Manager Modal */}
      <BaselineManager
        currentTasks={processedTasks}
        activeBaseline={activeBaseline}
        baselines={baselines}
        onCreateBaseline={handleCreateBaseline}
        onSetActiveBaseline={handleSetActiveBaseline}
        onDeleteBaseline={handleDeleteBaseline}
        onUpdateBaseline={handleUpdateBaseline}
        isVisible={showBaselineManager}
        onClose={() => setShowBaselineManager(false)}
      />
      
      {/* Collaborative Features */}
      {enableCollaboration && (
        <>
          <NotificationPanel
            notifications={notifications}
            onMarkAsRead={markNotificationAsRead}
            onMarkAllAsRead={markAllNotificationsAsRead}
            isVisible={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
          
          {activeConflict && (
            <ConflictDialog
              conflict={activeConflict}
              onResolve={handleConflictResolve}
              onDismiss={handleConflictDismiss}
              isVisible={showConflictDialog}
            />
          )}
        </>
      )}
    </div>
  );
};