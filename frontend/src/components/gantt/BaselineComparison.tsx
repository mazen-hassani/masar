import React, { useMemo } from 'react';
import { BaselineSnapshot, BaselineTask } from './BaselineManager';
import {
  ArrowRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface BaselineComparisonProps {
  currentTasks: any[];
  activeBaseline: BaselineSnapshot;
  className?: string;
}

interface TaskComparison {
  id: string | number;
  name: string;
  current: {
    startDate: Date;
    endDate: Date;
    progress: number;
    duration: number;
  };
  baseline: {
    startDate: Date;
    endDate: Date;
    progress: number;
    duration: number;
  };
  variance: {
    startDays: number;
    endDays: number;
    durationDays: number;
    progressPercent: number;
  };
  status: 'improved' | 'degraded' | 'on-track';
}

export const BaselineComparison: React.FC<BaselineComparisonProps> = ({
  currentTasks,
  activeBaseline,
  className = ''
}) => {
  const taskComparisons = useMemo((): TaskComparison[] => {
    if (!activeBaseline || !currentTasks.length) return [];

    return currentTasks.map(currentTask => {
      const baselineTask = activeBaseline.tasks.find(bt => bt.id === currentTask.id);
      
      if (!baselineTask) {
        // New task not in baseline
        const currentStart = new Date(currentTask.calculatedStartDate || currentTask.start);
        const currentEnd = new Date(currentTask.calculatedEndDate || currentTask.end);
        const currentDuration = Math.round((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: currentTask.id,
          name: currentTask.name || 'Unknown Task',
          current: {
            startDate: currentStart,
            endDate: currentEnd,
            progress: currentTask.progress || 0,
            duration: currentDuration
          },
          baseline: {
            startDate: currentStart,
            endDate: currentEnd,
            progress: 0,
            duration: currentDuration
          },
          variance: {
            startDays: 0,
            endDays: 0,
            durationDays: 0,
            progressPercent: currentTask.progress || 0
          },
          status: 'on-track' as const
        };
      }

      const currentStart = new Date(currentTask.calculatedStartDate || currentTask.start);
      const currentEnd = new Date(currentTask.calculatedEndDate || currentTask.end);
      const currentDuration = Math.round((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));
      
      const startVariance = Math.round((currentStart.getTime() - baselineTask.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const endVariance = Math.round((currentEnd.getTime() - baselineTask.endDate.getTime()) / (1000 * 60 * 60 * 24));
      const durationVariance = currentDuration - baselineTask.duration;
      const progressVariance = (currentTask.progress || 0) - baselineTask.progress;

      let status: 'improved' | 'degraded' | 'on-track' = 'on-track';
      if (endVariance > 3 || progressVariance < -10) {
        status = 'degraded';
      } else if (endVariance < -3 || progressVariance > 10) {
        status = 'improved';
      }

      return {
        id: currentTask.id,
        name: currentTask.name || 'Unknown Task',
        current: {
          startDate: currentStart,
          endDate: currentEnd,
          progress: currentTask.progress || 0,
          duration: currentDuration
        },
        baseline: {
          startDate: baselineTask.startDate,
          endDate: baselineTask.endDate,
          progress: baselineTask.progress,
          duration: baselineTask.duration
        },
        variance: {
          startDays: startVariance,
          endDays: endVariance,
          durationDays: durationVariance,
          progressPercent: progressVariance
        },
        status
      };
    });
  }, [currentTasks, activeBaseline]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'improved':
        return 'text-green-600';
      case 'degraded':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'improved':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatVariance = (days: number) => {
    if (days === 0) return 'No change';
    const prefix = days > 0 ? '+' : '';
    const suffix = Math.abs(days) === 1 ? 'day' : 'days';
    return `${prefix}${days} ${suffix}`;
  };

  const getTimelineBarStyle = (task: TaskComparison, type: 'current' | 'baseline') => {
    const data = type === 'current' ? task.current : task.baseline;
    const totalRange = Math.max(
      task.current.endDate.getTime() - task.current.startDate.getTime(),
      task.baseline.endDate.getTime() - task.baseline.startDate.getTime()
    );
    
    if (totalRange === 0) return { width: '100%', left: '0%' };
    
    const width = ((data.endDate.getTime() - data.startDate.getTime()) / totalRange) * 100;
    const earliestStart = Math.min(task.current.startDate.getTime(), task.baseline.startDate.getTime());
    const left = ((data.startDate.getTime() - earliestStart) / totalRange) * 100;
    
    return {
      width: `${Math.max(width, 2)}%`,
      left: `${left}%`
    };
  };

  if (!activeBaseline || taskComparisons.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <p>No baseline comparison data available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Timeline Comparison: Current vs {activeBaseline.name}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-2 bg-blue-500 rounded"></div>
                <span>Current</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-2 bg-gray-300 rounded"></div>
                <span>Baseline</span>
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {taskComparisons.map(task => (
            <div key={task.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1">
                  {getStatusIcon(task.status)}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{task.name}</h4>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                      <span>Duration: {task.current.duration}d</span>
                      <span>Progress: {task.current.progress}%</span>
                      <span className={getStatusColor(task.status)}>
                        {task.status === 'on-track' ? 'On Track' : 
                         task.status === 'improved' ? 'Ahead' : 'Behind'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500 space-y-1">
                  <div>Start: {formatVariance(task.variance.startDays)}</div>
                  <div>End: {formatVariance(task.variance.endDays)}</div>
                </div>
              </div>

              {/* Visual Timeline Comparison */}
              <div className="space-y-2">
                <div className="relative">
                  <div className="text-xs text-gray-600 mb-1">Current Schedule</div>
                  <div className="relative h-4 bg-gray-100 rounded">
                    <div 
                      className="absolute h-full bg-blue-500 rounded"
                      style={getTimelineBarStyle(task, 'current')}
                    />
                    <div 
                      className="absolute h-full bg-blue-300 rounded"
                      style={{
                        ...getTimelineBarStyle(task, 'current'),
                        width: `${(getTimelineBarStyle(task, 'current').width.replace('%', '') as any) * (task.current.progress / 100)}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{task.current.startDate.toLocaleDateString()}</span>
                    <span>{task.current.endDate.toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="relative">
                  <div className="text-xs text-gray-600 mb-1">Baseline Schedule</div>
                  <div className="relative h-4 bg-gray-100 rounded">
                    <div 
                      className="absolute h-full bg-gray-300 rounded"
                      style={getTimelineBarStyle(task, 'baseline')}
                    />
                    <div 
                      className="absolute h-full bg-gray-400 rounded"
                      style={{
                        ...getTimelineBarStyle(task, 'baseline'),
                        width: `${(getTimelineBarStyle(task, 'baseline').width.replace('%', '') as any) * (task.baseline.progress / 100)}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{task.baseline.startDate.toLocaleDateString()}</span>
                    <span>{task.baseline.endDate.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Variance Summary */}
              {(Math.abs(task.variance.startDays) > 0 || 
                Math.abs(task.variance.endDays) > 0 || 
                Math.abs(task.variance.progressPercent) > 5) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-gray-600">Start Variance:</span>
                      <div className={`font-medium ${task.variance.startDays > 0 ? 'text-red-600' : task.variance.startDays < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {formatVariance(task.variance.startDays)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">End Variance:</span>
                      <div className={`font-medium ${task.variance.endDays > 0 ? 'text-red-600' : task.variance.endDays < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {formatVariance(task.variance.endDays)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Duration Change:</span>
                      <div className={`font-medium ${task.variance.durationDays > 0 ? 'text-red-600' : task.variance.durationDays < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {formatVariance(task.variance.durationDays)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Progress Variance:</span>
                      <div className={`font-medium ${task.variance.progressPercent < 0 ? 'text-red-600' : task.variance.progressPercent > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {task.variance.progressPercent > 0 ? '+' : ''}{task.variance.progressPercent.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BaselineComparison;