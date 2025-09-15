import React, { useState, useEffect, useMemo } from 'react';
import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// Validation interfaces
interface ValidationResult {
  isValid: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
  affectedTasks?: string[];
  suggestedActions?: string[];
}

interface TaskValidationContext {
  taskId: string | number;
  newStartDate: Date;
  newEndDate: Date;
  dependencies: (string | number)[];
  assigneeId?: string;
}

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  validate: (context: TaskValidationContext, allTasks: any[]) => ValidationResult;
  priority: number; // 1 = highest priority
}

interface GanttValidationProps {
  validationResults: ValidationResult[];
  onDismiss: (index: number) => void;
  onAccept: (result: ValidationResult) => void;
  onRevert: () => void;
  isVisible: boolean;
}

// Validation rules implementation
const VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'dependency_constraint',
    name: 'Dependency Constraint',
    description: 'Tasks must start after their dependencies are completed',
    priority: 1,
    validate: (context, allTasks) => {
      const dependencyViolations: string[] = [];
      
      context.dependencies.forEach(depId => {
        const depTask = allTasks.find(t => t.id.toString() === depId.toString());
        if (depTask && depTask.calculatedEndDate) {
          const depEndDate = new Date(depTask.calculatedEndDate);
          if (context.newStartDate <= depEndDate) {
            dependencyViolations.push(`Task depends on "${depTask.name || 'Unknown'}" which ends ${depEndDate.toLocaleDateString()}`);
          }
        }
      });

      if (dependencyViolations.length > 0) {
        const earliestStart = Math.max(
          ...context.dependencies.map(depId => {
            const depTask = allTasks.find(t => t.id.toString() === depId.toString());
            return depTask?.calculatedEndDate ? new Date(depTask.calculatedEndDate).getTime() + 86400000 : 0;
          })
        );

        return {
          isValid: false,
          severity: 'error' as const,
          message: `Dependency constraint violation: ${dependencyViolations.join(', ')}`,
          suggestedActions: [
            `Move start date to ${new Date(earliestStart).toLocaleDateString()} or later`,
            'Remove blocking dependencies',
            'Adjust dependency task completion dates'
          ]
        };
      }

      return {
        isValid: true,
        severity: 'info' as const,
        message: 'Dependency constraints satisfied'
      };
    }
  },
  {
    id: 'working_calendar',
    name: 'Working Calendar',
    description: 'Tasks should align with working days and hours',
    priority: 2,
    validate: (context) => {
      const startDay = context.newStartDate.getDay();
      const endDay = context.newEndDate.getDay();
      
      // Check for weekend starts/ends
      if (startDay === 0 || startDay === 6) {
        return {
          isValid: false,
          severity: 'warning' as const,
          message: 'Task starts on a weekend',
          suggestedActions: ['Move start date to next Monday', 'Configure custom working calendar']
        };
      }
      
      if (endDay === 0 || endDay === 6) {
        return {
          isValid: false,
          severity: 'warning' as const,
          message: 'Task ends on a weekend',
          suggestedActions: ['Adjust end date to Friday', 'Configure custom working calendar']
        };
      }

      return {
        isValid: true,
        severity: 'info' as const,
        message: 'Working calendar constraints satisfied'
      };
    }
  },
  {
    id: 'resource_availability',
    name: 'Resource Availability',
    description: 'Check for resource over-allocation during task period',
    priority: 3,
    validate: (context, allTasks) => {
      if (!context.assigneeId) {
        return {
          isValid: true,
          severity: 'info' as const,
          message: 'No assignee specified'
        };
      }

      // Find overlapping tasks for the same assignee
      const overlappingTasks = allTasks.filter(task => {
        if (!task.assigneeId || task.assigneeId !== context.assigneeId || task.id === context.taskId) {
          return false;
        }

        const taskStart = new Date(task.calculatedStartDate);
        const taskEnd = new Date(task.calculatedEndDate);
        
        return (
          (context.newStartDate >= taskStart && context.newStartDate <= taskEnd) ||
          (context.newEndDate >= taskStart && context.newEndDate <= taskEnd) ||
          (context.newStartDate <= taskStart && context.newEndDate >= taskEnd)
        );
      });

      if (overlappingTasks.length > 0) {
        return {
          isValid: false,
          severity: 'warning' as const,
          message: `Resource over-allocation: ${overlappingTasks.length} overlapping task(s)`,
          affectedTasks: overlappingTasks.map(t => t.name || t.id.toString()),
          suggestedActions: [
            'Reschedule conflicting tasks',
            'Assign different team member',
            'Split task into smaller chunks'
          ]
        };
      }

      return {
        isValid: true,
        severity: 'info' as const,
        message: 'Resource availability confirmed'
      };
    }
  },
  {
    id: 'duration_constraint',
    name: 'Duration Constraint',
    description: 'Validate minimum and maximum task duration limits',
    priority: 4,
    validate: (context) => {
      const durationMs = context.newEndDate.getTime() - context.newStartDate.getTime();
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

      if (durationDays < 1) {
        return {
          isValid: false,
          severity: 'error' as const,
          message: 'Task duration must be at least 1 day',
          suggestedActions: ['Extend end date', 'Adjust start date']
        };
      }

      if (durationDays > 90) {
        return {
          isValid: false,
          severity: 'warning' as const,
          message: 'Task duration exceeds 90 days - consider breaking into smaller tasks',
          suggestedActions: ['Break into subtasks', 'Review task scope', 'Create milestones']
        };
      }

      return {
        isValid: true,
        severity: 'info' as const,
        message: `Task duration: ${durationDays} days`
      };
    }
  },
  {
    id: 'critical_path',
    name: 'Critical Path Impact',
    description: 'Analyze impact on project critical path',
    priority: 5,
    validate: (context, allTasks) => {
      // Simplified critical path analysis
      const taskHasDependents = allTasks.some(task => 
        task.dependencies && task.dependencies.includes(context.taskId)
      );

      if (taskHasDependents) {
        const delay = context.newEndDate.getTime() - 
          (allTasks.find(t => t.id === context.taskId)?.calculatedEndDate?.getTime() || 0);
        
        if (delay > 86400000) { // More than 1 day delay
          return {
            isValid: false,
            severity: 'warning' as const,
            message: 'Change may delay dependent tasks and affect project timeline',
            suggestedActions: [
              'Review impact on downstream tasks',
              'Consider parallel execution',
              'Notify stakeholders of potential delays'
            ]
          };
        }
      }

      return {
        isValid: true,
        severity: 'info' as const,
        message: 'No critical path impact detected'
      };
    }
  }
];

// Custom hook for task validation
export const useTaskValidation = () => {
  const validateTaskChange = (
    taskId: string | number,
    newStartDate: Date,
    newEndDate: Date,
    dependencies: (string | number)[],
    allTasks: any[],
    assigneeId?: string
  ): ValidationResult[] => {
    const context: TaskValidationContext = {
      taskId,
      newStartDate,
      newEndDate,
      dependencies,
      assigneeId
    };

    return VALIDATION_RULES
      .sort((a, b) => a.priority - b.priority)
      .map(rule => rule.validate(context, allTasks))
      .filter(result => !result.isValid || result.severity !== 'info');
  };

  return { validateTaskChange };
};

// Validation panel component
export const GanttValidation: React.FC<GanttValidationProps> = ({
  validationResults,
  onDismiss,
  onAccept,
  onRevert,
  isVisible
}) => {
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedResults(newExpanded);
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XMarkIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const hasErrors = validationResults.some(r => r.severity === 'error');
  const hasWarnings = validationResults.some(r => r.severity === 'warning');

  if (!isVisible || validationResults.length === 0) return null;

  return (
    <div className="fixed inset-x-0 top-20 z-50 mx-4 sm:mx-6 lg:mx-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {hasErrors && <XMarkIcon className="h-6 w-6 text-red-500" />}
                {!hasErrors && hasWarnings && <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />}
                {!hasErrors && !hasWarnings && <CheckCircleIcon className="h-6 w-6 text-green-500" />}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Task Validation Results
                  </h3>
                  <p className="text-sm text-gray-600">
                    {hasErrors ? 'Errors must be resolved before saving' : 
                     hasWarnings ? 'Warnings detected - review before proceeding' : 
                     'All validations passed'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={onRevert}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Revert Changes
                </button>
                {!hasErrors && (
                  <button
                    onClick={() => validationResults.forEach(onAccept)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Accept Changes
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {validationResults.map((result, index) => (
              <div
                key={index}
                className={`border-l-4 ${getSeverityStyles(result.severity)} border-b border-gray-100 last:border-b-0`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getIcon(result.severity)}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {result.message}
                        </p>
                        {result.affectedTasks && result.affectedTasks.length > 0 && (
                          <p className="text-xs text-gray-600 mt-1">
                            Affected tasks: {result.affectedTasks.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {result.suggestedActions && result.suggestedActions.length > 0 && (
                        <button
                          onClick={() => toggleExpanded(index)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {expandedResults.has(index) ? 'Hide' : 'Show'} Actions
                        </button>
                      )}
                      <button
                        onClick={() => onDismiss(index)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {expandedResults.has(index) && result.suggestedActions && (
                    <div className="mt-3 ml-8">
                      <p className="text-xs font-medium text-gray-700 mb-2">Suggested Actions:</p>
                      <ul className="space-y-1">
                        {result.suggestedActions.map((action, actionIndex) => (
                          <li
                            key={actionIndex}
                            className="text-xs text-gray-600 flex items-start"
                          >
                            <span className="mr-2">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Validation summary component for dashboard
export const ValidationSummary: React.FC<{
  validationResults: ValidationResult[];
  className?: string;
}> = ({ validationResults, className = '' }) => {
  const errorCount = validationResults.filter(r => r.severity === 'error').length;
  const warningCount = validationResults.filter(r => r.severity === 'warning').length;
  const infoCount = validationResults.filter(r => r.severity === 'info').length;

  if (validationResults.length === 0) return null;

  return (
    <div className={`flex items-center space-x-4 text-sm ${className}`}>
      {errorCount > 0 && (
        <div className="flex items-center space-x-1 text-red-600">
          <XMarkIcon className="h-4 w-4" />
          <span>{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
        </div>
      )}
      {warningCount > 0 && (
        <div className="flex items-center space-x-1 text-yellow-600">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <span>{warningCount} warning{warningCount !== 1 ? 's' : ''}</span>
        </div>
      )}
      {infoCount > 0 && (
        <div className="flex items-center space-x-1 text-blue-600">
          <InformationCircleIcon className="h-4 w-4" />
          <span>{infoCount} info</span>
        </div>
      )}
    </div>
  );
};