import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeftIcon, 
  AdjustmentsHorizontalIcon,
  DocumentArrowDownIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import { InteractiveGanttChart } from '../../components/gantt/InteractiveGanttChart';
import { Project, Activity, Task as TaskType } from '../../types';

// Mock API functions (replace with actual API calls)
const fetchProject = async (id: string): Promise<Project> => {
  // Mock project data
  return {
    id: parseInt(id) || 1,
    name: 'Sample Project',
    description: 'A sample project for Gantt chart demonstration',
    status: 'active' as any,
    priority: 'high' as any,
    trackingStatus: 'ON_TRACK' as any,
    organisation: { id: 1, name: 'Sample Organization' },
    percentageComplete: 65,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdById: 'user1'
  } as any;
};

const fetchProjectActivities = async (projectId: string): Promise<Activity[]> => {
  // Mock activities data
  return [
    {
      id: 1,
      name: 'Project Planning',
      description: 'Initial project planning phase',
      status: 'COMPLETED' as any,
      project: { id: parseInt(projectId) || 1, name: 'Sample Project' },
      percentageComplete: 100,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      name: 'Design Phase',
      description: 'System design and architecture',
      status: 'IN_PROGRESS' as any,
      project: { id: parseInt(projectId) || 1, name: 'Sample Project' },
      percentageComplete: 75,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 3,
      name: 'Development',
      description: 'Core development phase',
      status: 'NOT_STARTED' as any,
      project: { id: parseInt(projectId) || 1, name: 'Sample Project' },
      percentageComplete: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 4,
      name: 'Testing',
      description: 'Quality assurance and testing',
      status: 'NOT_STARTED' as any,
      project: { id: parseInt(projectId) || 1, name: 'Sample Project' },
      percentageComplete: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 5,
      name: 'Deployment',
      description: 'Production deployment and go-live',
      status: 'NOT_STARTED' as any,
      project: { id: parseInt(projectId) || 1, name: 'Sample Project' },
      percentageComplete: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ] as any;
};

const fetchProjectTasks = async (projectId: string): Promise<TaskType[]> => {
  // Mock tasks data with realistic distribution
  return [
    {
      id: 1,
      name: 'Project Requirements Analysis',
      description: 'Gather and analyze project requirements',
      status: 'COMPLETED' as any,
      percentageComplete: 100,
      activity: { id: 1, name: 'Project Planning' },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-05T00:00:00Z'
    },
    {
      id: 'task2',
      title: 'Stakeholder Interviews',
      description: 'Conduct interviews with key stakeholders',
      activityId: 1,
      projectId: parseInt(projectId) || 1,
      status: 'completed',
      priority: 'medium',
      assigneeId: 'user2',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-06T00:00:00Z',
      completedAt: '2024-01-06T00:00:00Z'
    },
    {
      id: 'task3',
      title: 'System Architecture Design',
      description: 'Design overall system architecture',
      activityId: 2,
      projectId: parseInt(projectId) || 1,
      status: 'in_progress',
      priority: 'high',
      assigneeId: 'user3',
      createdAt: '2024-01-06T00:00:00Z',
      updatedAt: '2024-01-10T00:00:00Z'
    },
    {
      id: 'task4',
      title: 'Database Design',
      description: 'Design database schema and relationships',
      activityId: 2,
      projectId: parseInt(projectId) || 1,
      status: 'in_progress',
      priority: 'high',
      assigneeId: 'user1',
      createdAt: '2024-01-07T00:00:00Z',
      updatedAt: '2024-01-11T00:00:00Z'
    },
    {
      id: 'task5',
      title: 'UI/UX Mockups',
      description: 'Create user interface mockups and prototypes',
      activityId: 2,
      projectId: parseInt(projectId) || 1,
      status: 'pending',
      priority: 'medium',
      assigneeId: 'user4',
      createdAt: '2024-01-08T00:00:00Z',
      updatedAt: '2024-01-08T00:00:00Z'
    },
    {
      id: 'task6',
      title: 'Backend API Development',
      description: 'Implement core backend APIs',
      activityId: 3,
      projectId: parseInt(projectId) || 1,
      status: 'pending',
      priority: 'high',
      assigneeId: 'user2',
      createdAt: '2024-01-12T00:00:00Z',
      updatedAt: '2024-01-12T00:00:00Z',
      dependencies: [3, 4]
    },
    {
      id: 'task7',
      title: 'Frontend Components',
      description: 'Develop reusable frontend components',
      activityId: 3,
      projectId: parseInt(projectId) || 1,
      status: 'pending',
      priority: 'medium',
      assigneeId: 'user3',
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
      dependencies: [5]
    },
    {
      id: 'task8',
      title: 'Integration Testing',
      description: 'Test API and frontend integration',
      activityId: 4,
      projectId: parseInt(projectId) || 1,
      status: 'pending',
      priority: 'high',
      assigneeId: 'user1',
      createdAt: '2024-02-01T00:00:00Z',
      updatedAt: '2024-02-01T00:00:00Z',
      dependencies: [6, 7]
    },
    {
      id: 'task9',
      title: 'User Acceptance Testing',
      description: 'Conduct UAT with stakeholders',
      activityId: 4,
      projectId: parseInt(projectId) || 1,
      status: 'pending',
      priority: 'high',
      assigneeId: 'user4',
      createdAt: '2024-02-05T00:00:00Z',
      updatedAt: '2024-02-05T00:00:00Z',
      dependencies: [8]
    },
    {
      id: 'task10',
      title: 'Production Deployment',
      description: 'Deploy application to production environment',
      activityId: 5,
      projectId: parseInt(projectId) || 1,
      status: 'pending',
      priority: 'high',
      assigneeId: 'user2',
      createdAt: '2024-02-15T00:00:00Z',
      updatedAt: '2024-02-15T00:00:00Z',
      dependencies: [9]
    }
  ] as any;
};


export const ProjectGanttPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [viewMode, setViewMode] = useState<string>('Day');
  const [showSettings, setShowSettings] = useState(false);

  // Fetch project data
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });

  // Fetch activities
  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['activities', id],
    queryFn: () => fetchProjectActivities(id!),
    enabled: !!id,
  });

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => fetchProjectTasks(id!),
    enabled: !!id,
  });

  // Task update mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<TaskType> }) => {
      // Mock API call - replace with actual implementation
      console.log('Updating task:', taskId, updates);
      return { taskId, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    },
  });

  // Dependency creation mutation
  const createDependencyMutation = useMutation({
    mutationFn: async ({ fromTaskId, toTaskId }: { fromTaskId: string; toTaskId: string }) => {
      // Mock API call - replace with actual implementation
      console.log('Creating dependency:', fromTaskId, '->', toTaskId);
      return { fromTaskId, toTaskId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    },
  });

  const handleTaskUpdate = (taskId: string, updates: Partial<TaskType>) => {
    updateTaskMutation.mutate({ taskId, updates });
  };

  const handleDependencyCreate = (fromTaskId: string, toTaskId: string) => {
    createDependencyMutation.mutate({ fromTaskId, toTaskId });
  };

  const handleExport = () => {
    // Implementation for exporting Gantt chart
    console.log('Exporting Gantt chart...');
    // You could implement PDF export, image export, or Excel export here
  };

  const handlePrint = () => {
    window.print();
  };

  const isLoading = projectLoading || activitiesLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <button
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate(`/projects/${id}`)}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gantt Chart</h1>
                <p className="text-gray-600">{project.name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* View Mode Selector */}
              <div className="flex items-center space-x-2">
                <label htmlFor="viewMode" className="text-sm font-medium text-gray-700">
                  View:
                </label>
                <select
                  id="viewMode"
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value)}
                  className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="Quarter Day">Quarter Day</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Day">Day</option>
                  <option value="Week">Week</option>
                  <option value="Month">Month</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Settings"
                >
                  <AdjustmentsHorizontalIcon className="h-5 w-5" />
                </button>
                
                <button
                  onClick={handleExport}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Export"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                </button>
                
                <button
                  onClick={handlePrint}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Print"
                >
                  <PrinterIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Coding
                </label>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                    <span>Completed Tasks</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                    <span>In Progress Tasks</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                    <span>High Priority / Overdue</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                    <span>Medium Priority</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-500 rounded mr-2"></div>
                    <span>Low Priority</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Features
                </label>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>• Drag to reschedule tasks</p>
                  <p>• Click bars to adjust progress</p>
                  <p>• Click task names for details</p>
                  <p>• Dependency visualization</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Actions
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => setViewMode('Week')}
                    className="block w-full text-left px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Switch to Week View
                  </button>
                  <button
                    onClick={() => setViewMode('Month')}
                    className="block w-full text-left px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Switch to Month View
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <InteractiveGanttChart
          project={project}
          activities={activities}
          tasks={tasks}
          viewMode={viewMode}
          onTaskUpdate={handleTaskUpdate}
          onDependencyCreate={handleDependencyCreate}
        />
      </div>
    </div>
  );
};