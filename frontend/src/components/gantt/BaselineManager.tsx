import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

export interface BaselineSnapshot {
  id: string;
  name: string;
  description?: string;
  createdDate: Date;
  createdBy: string;
  isActive: boolean;
  tasks: BaselineTask[];
  projectMetrics: {
    totalDuration: number;
    totalCost: number;
    taskCount: number;
    milestoneCount: number;
  };
}

export interface BaselineTask {
  id: string | number;
  name: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  progress: number;
  assigneeId?: string;
  cost?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies: (string | number)[];
}

export interface VarianceAnalysis {
  taskId: string | number;
  taskName: string;
  startDateVariance: number; // in days
  endDateVariance: number;
  durationVariance: number;
  progressVariance: number;
  costVariance?: number;
  schedulePerformanceIndex: number; // SPI
  costPerformanceIndex?: number; // CPI
  status: 'on-track' | 'at-risk' | 'delayed' | 'ahead';
}

interface BaselineManagerProps {
  currentTasks: any[];
  activeBaseline?: BaselineSnapshot;
  baselines: BaselineSnapshot[];
  onCreateBaseline: (baseline: Omit<BaselineSnapshot, 'id' | 'createdDate'>) => void;
  onSetActiveBaseline: (baselineId: string) => void;
  onDeleteBaseline: (baselineId: string) => void;
  onUpdateBaseline: (baseline: BaselineSnapshot) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const BaselineManager: React.FC<BaselineManagerProps> = ({
  currentTasks,
  activeBaseline,
  baselines,
  onCreateBaseline,
  onSetActiveBaseline,
  onDeleteBaseline,
  onUpdateBaseline,
  isVisible,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'compare' | 'variance'>('manage');
  const [newBaselineName, setNewBaselineName] = useState('');
  const [newBaselineDescription, setNewBaselineDescription] = useState('');
  const [selectedBaseline, setSelectedBaseline] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Calculate variance analysis between current state and active baseline
  const varianceAnalysis = useMemo((): VarianceAnalysis[] => {
    if (!activeBaseline || !currentTasks.length) return [];

    return currentTasks.map(currentTask => {
      const baselineTask = activeBaseline.tasks.find(bt => bt.id === currentTask.id);
      if (!baselineTask) {
        return {
          taskId: currentTask.id,
          taskName: currentTask.name || 'Unknown Task',
          startDateVariance: 0,
          endDateVariance: 0,
          durationVariance: 0,
          progressVariance: 0,
          schedulePerformanceIndex: 1,
          status: 'on-track' as const
        };
      }

      const currentStart = new Date(currentTask.calculatedStartDate || currentTask.start);
      const currentEnd = new Date(currentTask.calculatedEndDate || currentTask.end);
      const baselineStart = new Date(baselineTask.startDate);
      const baselineEnd = new Date(baselineTask.endDate);

      const startVariance = Math.round((currentStart.getTime() - baselineStart.getTime()) / (1000 * 60 * 60 * 24));
      const endVariance = Math.round((currentEnd.getTime() - baselineEnd.getTime()) / (1000 * 60 * 60 * 24));
      const durationVariance = Math.round((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) - baselineTask.duration;
      const progressVariance = (currentTask.progress || 0) - baselineTask.progress;

      // Schedule Performance Index (SPI) = Earned Value / Planned Value
      const plannedValue = baselineTask.progress;
      const earnedValue = Math.min((currentTask.progress || 0), 100);
      const spi = plannedValue > 0 ? earnedValue / plannedValue : 1;

      let status: 'on-track' | 'at-risk' | 'delayed' | 'ahead' = 'on-track';
      if (endVariance > 5 || spi < 0.8) status = 'delayed';
      else if (endVariance < -5 || spi > 1.2) status = 'ahead';
      else if (Math.abs(endVariance) > 2 || spi < 0.9) status = 'at-risk';

      return {
        taskId: currentTask.id,
        taskName: currentTask.name || 'Unknown Task',
        startDateVariance: startVariance,
        endDateVariance: endVariance,
        durationVariance,
        progressVariance,
        schedulePerformanceIndex: spi,
        status
      };
    });
  }, [currentTasks, activeBaseline]);

  // Project-level metrics comparison
  const projectComparison = useMemo(() => {
    if (!activeBaseline || !currentTasks.length) return null;

    const currentMetrics = {
      totalDuration: Math.max(...currentTasks.map(t => {
        const end = new Date(t.calculatedEndDate || t.end);
        const start = new Date(t.calculatedStartDate || t.start);
        return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      })),
      taskCount: currentTasks.length,
      avgProgress: currentTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / currentTasks.length,
      delayedTasks: varianceAnalysis.filter(v => v.status === 'delayed').length,
      aheadTasks: varianceAnalysis.filter(v => v.status === 'ahead').length
    };

    const baselineMetrics = activeBaseline.projectMetrics;

    return {
      current: currentMetrics,
      baseline: baselineMetrics,
      variance: {
        durationChange: currentMetrics.totalDuration - baselineMetrics.totalDuration,
        taskCountChange: currentMetrics.taskCount - baselineMetrics.taskCount,
        overallSPI: varianceAnalysis.reduce((sum, v) => sum + v.schedulePerformanceIndex, 0) / varianceAnalysis.length
      }
    };
  }, [activeBaseline, currentTasks, varianceAnalysis]);

  const createBaseline = () => {
    if (!newBaselineName.trim()) return;

    const baselineTasks: BaselineTask[] = currentTasks.map(task => ({
      id: task.id,
      name: task.name || 'Unknown Task',
      startDate: new Date(task.calculatedStartDate || task.start),
      endDate: new Date(task.calculatedEndDate || task.end),
      duration: Math.round((new Date(task.calculatedEndDate || task.end).getTime() - 
                           new Date(task.calculatedStartDate || task.start).getTime()) / (1000 * 60 * 60 * 24)),
      progress: task.progress || 0,
      assigneeId: task.assigneeId,
      cost: task.cost,
      priority: task.priority || 'medium',
      dependencies: task.dependencies || []
    }));

    const projectMetrics = {
      totalDuration: Math.max(...baselineTasks.map(t => t.duration)),
      totalCost: baselineTasks.reduce((sum, t) => sum + (t.cost || 0), 0),
      taskCount: baselineTasks.length,
      milestoneCount: baselineTasks.filter(t => t.duration === 0).length
    };

    onCreateBaseline({
      name: newBaselineName,
      description: newBaselineDescription,
      createdBy: 'Current User', // This would come from auth context
      isActive: baselines.length === 0, // Make first baseline active
      tasks: baselineTasks,
      projectMetrics
    });

    setNewBaselineName('');
    setNewBaselineDescription('');
    setShowCreateForm(false);
  };

  const getVarianceColor = (variance: number, type: 'date' | 'progress' | 'spi') => {
    if (type === 'spi') {
      if (variance >= 1.1) return 'text-green-600';
      if (variance >= 0.9) return 'text-gray-600';
      if (variance >= 0.8) return 'text-yellow-600';
      return 'text-red-600';
    }
    
    if (type === 'progress') {
      if (variance > 5) return 'text-green-600';
      if (variance > -5) return 'text-gray-600';
      if (variance > -15) return 'text-yellow-600';
      return 'text-red-600';
    }
    
    // date variance
    if (variance < -2) return 'text-green-600';
    if (variance <= 2) return 'text-gray-600';
    if (variance <= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ahead':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-green-500" />;
      case 'on-track':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'at-risk':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case 'delayed':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="inline-block w-full max-w-6xl my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Baseline Management & Variance Analysis
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                ×
              </button>
            </div>
            <div className="mt-4">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('manage')}
                  className={`pb-2 text-sm font-medium border-b-2 ${
                    activeTab === 'manage'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Manage Baselines
                </button>
                <button
                  onClick={() => setActiveTab('compare')}
                  className={`pb-2 text-sm font-medium border-b-2 ${
                    activeTab === 'compare'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Project Comparison
                </button>
                <button
                  onClick={() => setActiveTab('variance')}
                  className={`pb-2 text-sm font-medium border-b-2 ${
                    activeTab === 'variance'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Variance Analysis
                </button>
              </nav>
            </div>
          </div>

          <div className="px-6 py-4 max-h-96 overflow-y-auto">
            {activeTab === 'manage' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-md font-medium text-gray-900">Saved Baselines</h4>
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                    <span>Create Baseline</span>
                  </button>
                </div>

                {showCreateForm && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Baseline Name
                      </label>
                      <input
                        type="text"
                        value={newBaselineName}
                        onChange={(e) => setNewBaselineName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="e.g., Sprint 1 Baseline, Project Kickoff"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (Optional)
                      </label>
                      <textarea
                        value={newBaselineDescription}
                        onChange={(e) => setNewBaselineDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        rows={2}
                        placeholder="Describe the baseline snapshot..."
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowCreateForm(false)}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={createBaseline}
                        disabled={!newBaselineName.trim()}
                        className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Create Baseline
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {baselines.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <DocumentDuplicateIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No baselines created yet</p>
                      <p className="text-sm">Create your first baseline to track project progress</p>
                    </div>
                  ) : (
                    baselines.map(baseline => (
                      <div
                        key={baseline.id}
                        className={`border rounded-lg p-4 ${
                          baseline.isActive ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h5 className="font-medium text-gray-900">{baseline.name}</h5>
                              {baseline.isActive && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  Active
                                </span>
                              )}
                            </div>
                            {baseline.description && (
                              <p className="text-sm text-gray-600 mt-1">{baseline.description}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center space-x-1">
                                <CalendarIcon className="h-3 w-3" />
                                <span>{baseline.createdDate.toLocaleDateString()}</span>
                              </span>
                              <span>{baseline.projectMetrics.taskCount} tasks</span>
                              <span>{baseline.projectMetrics.totalDuration} days</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {!baseline.isActive && (
                              <button
                                onClick={() => onSetActiveBaseline(baseline.id)}
                                className="text-blue-600 hover:text-blue-700 text-xs"
                              >
                                Set Active
                              </button>
                            )}
                            <button className="text-gray-400 hover:text-gray-600">
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button className="text-gray-400 hover:text-gray-600">
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDeleteBaseline(baseline.id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'compare' && (
              <div className="space-y-6">
                {!activeBaseline ? (
                  <div className="text-center py-8 text-gray-500">
                    <ChartBarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No active baseline selected</p>
                    <p className="text-sm">Set a baseline to see project comparison</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">
                        Project Overview: Current vs Baseline
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">
                            {projectComparison?.current.taskCount || 0}
                          </div>
                          <div className="text-sm text-gray-600">Total Tasks</div>
                          <div className={`text-xs ${
                            (projectComparison?.variance.taskCountChange || 0) > 0 ? 'text-red-500' : 
                            (projectComparison?.variance.taskCountChange || 0) < 0 ? 'text-green-500' : 'text-gray-500'
                          }`}>
                            {projectComparison?.variance.taskCountChange !== 0 && 
                             (projectComparison?.variance.taskCountChange || 0 > 0 ? '+' : '')
                            }{projectComparison?.variance.taskCountChange || 0} vs baseline
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">
                            {Math.round(projectComparison?.current.avgProgress || 0)}%
                          </div>
                          <div className="text-sm text-gray-600">Avg Progress</div>
                          <div className="text-xs text-gray-500">
                            SPI: {(projectComparison?.variance.overallSPI || 1).toFixed(2)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">
                            {projectComparison?.current.delayedTasks || 0}
                          </div>
                          <div className="text-sm text-gray-600">Tasks Delayed</div>
                          <div className="text-xs text-green-500">
                            {projectComparison?.current.aheadTasks || 0} ahead of schedule
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'variance' && (
              <div className="space-y-6">
                {!activeBaseline ? (
                  <div className="text-center py-8 text-gray-500">
                    <ChartBarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No active baseline selected</p>
                    <p className="text-sm">Set a baseline to see variance analysis</p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <h4 className="font-medium text-gray-900">Task-Level Variance Analysis</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Task
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Start Variance
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              End Variance
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Progress
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              SPI
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {varianceAnalysis.map((variance) => (
                            <tr key={variance.taskId} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {variance.taskName}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  {getStatusIcon(variance.status)}
                                  <span className="text-xs text-gray-600 capitalize">
                                    {variance.status.replace('-', ' ')}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={getVarianceColor(variance.startDateVariance, 'date')}>
                                  {variance.startDateVariance > 0 ? '+' : ''}{variance.startDateVariance}d
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={getVarianceColor(variance.endDateVariance, 'date')}>
                                  {variance.endDateVariance > 0 ? '+' : ''}{variance.endDateVariance}d
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={getVarianceColor(variance.progressVariance, 'progress')}>
                                  {variance.progressVariance > 0 ? '+' : ''}{variance.progressVariance.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={getVarianceColor(variance.schedulePerformanceIndex, 'spi')}>
                                  {variance.schedulePerformanceIndex.toFixed(2)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaselineManager;