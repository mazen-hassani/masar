import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRightIcon,
  LinkIcon,
  TrashIcon,
  PlusIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Dependency types following project management standards
export enum DependencyType {
  FS = 'FS', // Finish to Start (most common)
  SS = 'SS', // Start to Start
  FF = 'FF', // Finish to Finish
  SF = 'SF'  // Start to Finish (rare)
}

interface TaskDependency {
  id: string;
  predecessorId: string | number;
  successorId: string | number;
  type: DependencyType;
  lag: number; // in days (can be negative for leads)
  isExternal?: boolean; // for cross-project dependencies
  description?: string;
}

interface DependencyManagerProps {
  tasks: any[];
  dependencies: TaskDependency[];
  onAddDependency: (dependency: Omit<TaskDependency, 'id'>) => void;
  onRemoveDependency: (dependencyId: string) => void;
  onUpdateDependency: (dependencyId: string, updates: Partial<TaskDependency>) => void;
  isVisible: boolean;
  onClose: () => void;
  selectedTaskId?: string | number;
}

interface DependencyValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const DependencyManager: React.FC<DependencyManagerProps> = ({
  tasks,
  dependencies,
  onAddDependency,
  onRemoveDependency,
  onUpdateDependency,
  isVisible,
  onClose,
  selectedTaskId
}) => {
  const [newDependency, setNewDependency] = useState<{
    predecessorId: string;
    successorId: string;
    type: DependencyType;
    lag: number;
    description: string;
  }>({
    predecessorId: '',
    successorId: selectedTaskId?.toString() || '',
    type: DependencyType.FS,
    lag: 0,
    description: ''
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filter, setFilter] = useState<'all' | 'errors' | 'warnings'>('all');

  // Reset form when selectedTaskId changes
  useEffect(() => {
    if (selectedTaskId) {
      setNewDependency(prev => ({
        ...prev,
        successorId: selectedTaskId.toString()
      }));
    }
  }, [selectedTaskId]);

  // Validate dependency creation
  const validateDependency = (
    predId: string,
    succId: string,
    type: DependencyType,
    lag: number
  ): DependencyValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!predId || !succId) {
      errors.push('Both predecessor and successor tasks must be selected');
    }

    if (predId === succId) {
      errors.push('A task cannot depend on itself');
    }

    // Check for circular dependencies
    const wouldCreateCircle = checkCircularDependency(predId, succId);
    if (wouldCreateCircle) {
      errors.push('This dependency would create a circular reference');
    }

    // Check for duplicate dependencies
    const duplicate = dependencies.find(dep => 
      dep.predecessorId.toString() === predId && 
      dep.successorId.toString() === succId && 
      dep.type === type
    );
    if (duplicate) {
      errors.push('This dependency already exists');
    }

    // Warnings for complex scenarios
    if (Math.abs(lag) > 30) {
      warnings.push(`Large lag value (${lag} days) - consider breaking into separate tasks`);
    }

    if (type === DependencyType.SF) {
      warnings.push('Start-to-Finish dependencies are uncommon and may cause confusion');
    }

    const predTask = tasks.find(t => t.id.toString() === predId);
    const succTask = tasks.find(t => t.id.toString() === succId);
    
    if (predTask && succTask) {
      const predEndDate = new Date(predTask.calculatedEndDate || predTask.endDate || predTask.updatedAt);
      const succStartDate = new Date(succTask.calculatedStartDate || succTask.startDate || succTask.createdAt);
      
      if (type === DependencyType.FS && predEndDate > succStartDate && lag >= 0) {
        warnings.push('Successor task starts before predecessor ends - may need schedule adjustment');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  // Check for circular dependencies using DFS
  const checkCircularDependency = (newPredId: string, newSuccId: string): boolean => {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (taskId: string): boolean => {
      if (recursionStack.has(taskId)) return true;
      if (visited.has(taskId)) return false;

      visited.add(taskId);
      recursionStack.add(taskId);

      // Check existing dependencies
      const taskDeps = dependencies.filter(dep => dep.predecessorId.toString() === taskId);
      
      // Include the new dependency if we're checking
      if (taskId === newPredId) {
        taskDeps.push({
          id: 'temp',
          predecessorId: newPredId,
          successorId: newSuccId,
          type: DependencyType.FS,
          lag: 0
        });
      }

      for (const dep of taskDeps) {
        if (hasCycle(dep.successorId.toString())) {
          return true;
        }
      }

      recursionStack.delete(taskId);
      return false;
    };

    return hasCycle(newPredId);
  };

  // Get dependency validation for current form
  const currentValidation = useMemo(() => {
    return validateDependency(
      newDependency.predecessorId,
      newDependency.successorId,
      newDependency.type,
      newDependency.lag
    );
  }, [newDependency, tasks, dependencies]);

  // Get task name helper
  const getTaskName = (taskId: string | number) => {
    const task = tasks.find(t => t.id.toString() === taskId.toString());
    return task ? (task.name || task.title || `Task ${taskId}`) : `Unknown Task ${taskId}`;
  };

  // Handle form submission
  const handleAddDependency = () => {
    if (currentValidation.isValid) {
      onAddDependency({
        predecessorId: newDependency.predecessorId,
        successorId: newDependency.successorId,
        type: newDependency.type,
        lag: newDependency.lag,
        description: newDependency.description || undefined
      });

      // Reset form
      setNewDependency({
        predecessorId: '',
        successorId: selectedTaskId?.toString() || '',
        type: DependencyType.FS,
        lag: 0,
        description: ''
      });
    }
  };

  // Get dependency description
  const getDependencyDescription = (dep: TaskDependency): string => {
    const predName = getTaskName(dep.predecessorId);
    const succName = getTaskName(dep.successorId);
    const lagText = dep.lag !== 0 ? ` (${dep.lag > 0 ? '+' : ''}${dep.lag} days)` : '';
    
    switch (dep.type) {
      case DependencyType.FS:
        return `${predName} must finish before ${succName} starts${lagText}`;
      case DependencyType.SS:
        return `${predName} and ${succName} must start together${lagText}`;
      case DependencyType.FF:
        return `${predName} and ${succName} must finish together${lagText}`;
      case DependencyType.SF:
        return `${predName} must start before ${succName} finishes${lagText}`;
      default:
        return `${predName} → ${succName}`;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Dependency Management</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Manage task dependencies to establish proper project scheduling constraints
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add New Dependency */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                <PlusIcon className="h-5 w-5 mr-2" />
                Add New Dependency
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Predecessor Task (must be completed first)
                  </label>
                  <select
                    value={newDependency.predecessorId}
                    onChange={(e) => setNewDependency(prev => ({ ...prev, predecessorId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select predecessor task...</option>
                    {tasks.map(task => (
                      <option key={task.id} value={task.id.toString()}>
                        {getTaskName(task.id)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-center py-2">
                  <ArrowRightIcon className="h-6 w-6 text-gray-400" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Successor Task (depends on predecessor)
                  </label>
                  <select
                    value={newDependency.successorId}
                    onChange={(e) => setNewDependency(prev => ({ ...prev, successorId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select successor task...</option>
                    {tasks.map(task => (
                      <option key={task.id} value={task.id.toString()}>
                        {getTaskName(task.id)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dependency Type
                    </label>
                    <select
                      value={newDependency.type}
                      onChange={(e) => setNewDependency(prev => ({ ...prev, type: e.target.value as DependencyType }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={DependencyType.FS}>Finish to Start (FS)</option>
                      <option value={DependencyType.SS}>Start to Start (SS)</option>
                      <option value={DependencyType.FF}>Finish to Finish (FF)</option>
                      <option value={DependencyType.SF}>Start to Finish (SF)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lag (days)
                    </label>
                    <input
                      type="number"
                      value={newDependency.lag}
                      onChange={(e) => setNewDependency(prev => ({ ...prev, lag: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                {showAdvanced && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      value={newDependency.description}
                      onChange={(e) => setNewDependency(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="Additional notes about this dependency..."
                    />
                  </div>
                )}

                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                </button>

                {/* Validation Messages */}
                {(currentValidation.errors.length > 0 || currentValidation.warnings.length > 0) && (
                  <div className="space-y-2">
                    {currentValidation.errors.map((error, index) => (
                      <div key={`error-${index}`} className="flex items-start space-x-2 text-sm text-red-600">
                        <ExclamationTriangleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    ))}
                    {currentValidation.warnings.map((warning, index) => (
                      <div key={`warning-${index}`} className="flex items-start space-x-2 text-sm text-yellow-600">
                        <ExclamationTriangleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={handleAddDependency}
                    disabled={!currentValidation.isValid}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Dependency
                  </button>
                  <button
                    onClick={() => setNewDependency({
                      predecessorId: '',
                      successorId: selectedTaskId?.toString() || '',
                      type: DependencyType.FS,
                      lag: 0,
                      description: ''
                    })}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Existing Dependencies */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-800 flex items-center">
                  <LinkIcon className="h-5 w-5 mr-2" />
                  Existing Dependencies ({dependencies.length})
                </h4>
                
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as 'all' | 'errors' | 'warnings')}
                  className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="errors">With Errors</option>
                  <option value="warnings">With Warnings</option>
                </select>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {dependencies.map((dep) => {
                  const validation = validateDependency(
                    dep.predecessorId.toString(),
                    dep.successorId.toString(),
                    dep.type,
                    dep.lag
                  );

                  const hasIssues = validation.errors.length > 0 || validation.warnings.length > 0;
                  
                  if (filter === 'errors' && validation.errors.length === 0) return null;
                  if (filter === 'warnings' && validation.warnings.length === 0) return null;

                  return (
                    <div
                      key={dep.id}
                      className={`p-3 border rounded-lg ${
                        validation.errors.length > 0 ? 'border-red-200 bg-red-50' :
                        validation.warnings.length > 0 ? 'border-yellow-200 bg-yellow-50' :
                        'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {getDependencyDescription(dep)}
                          </p>
                          {dep.description && (
                            <p className="text-xs text-gray-600 mt-1">{dep.description}</p>
                          )}
                          
                          {hasIssues && (
                            <div className="mt-2 space-y-1">
                              {validation.errors.map((error, index) => (
                                <p key={`dep-error-${index}`} className="text-xs text-red-600">• {error}</p>
                              ))}
                              {validation.warnings.map((warning, index) => (
                                <p key={`dep-warning-${index}`} className="text-xs text-yellow-600">• {warning}</p>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => onRemoveDependency(dep.id)}
                          className="ml-3 p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove dependency"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                {dependencies.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <LinkIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No dependencies defined</p>
                    <p className="text-sm">Add dependencies to establish task relationships</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};