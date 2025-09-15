import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { projectService } from '../../services';
import Layout from '../../components/layout/Layout';
import { FormField } from '../../components/forms/FormField';
import { Priority, CreateProjectRequest, ProjectTemplate } from '../../types';
import { validationRules } from '../../utils/validation';

interface ProjectFormData extends CreateProjectRequest {
  templateId?: number;
}

interface ProjectCreationStep {
  id: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
}

export const ProjectCreationWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger
  } = useForm<ProjectFormData>({
    defaultValues: {
      priority: Priority.MEDIUM,
      startDate: new Date().toISOString().split('T')[0]
    }
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['project-templates'],
    queryFn: () => projectService.getProjectTemplates()
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: CreateProjectRequest) => projectService.createProject(data),
    onSuccess: (project) => {
      navigate(`/projects/${project.id}`, {
        replace: true,
        state: { message: 'Project created successfully!' }
      });
    }
  });

  const steps: ProjectCreationStep[] = [
    {
      id: 1,
      title: 'Template Selection',
      description: 'Choose a project template or start from scratch',
      isCompleted: currentStep > 1,
      isActive: currentStep === 1
    },
    {
      id: 2,
      title: 'Project Details',
      description: 'Basic project information and settings',
      isCompleted: currentStep > 2,
      isActive: currentStep === 2
    },
    {
      id: 3,
      title: 'Configuration',
      description: 'Advanced settings and team assignment',
      isCompleted: currentStep > 3,
      isActive: currentStep === 3
    },
    {
      id: 4,
      title: 'Review & Create',
      description: 'Review your settings and create the project',
      isCompleted: false,
      isActive: currentStep === 4
    }
  ];

  const nextStep = async () => {
    const isValid = await trigger();
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTemplateSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    setValue('templateId', template.id);
    setValue('name', template.name);
    setValue('description', template.description);
    setValue('priority', template.defaultPriority || Priority.MEDIUM);
  };

  const onSubmit = (data: ProjectFormData) => {
    createProjectMutation.mutate(data);
  };

  const renderStepIndicator = () => (
    <nav className="flex items-center justify-center mb-8">
      <ol className="flex items-center space-x-5">
        {steps.map((step, stepIdx) => (
          <li key={step.id} className="flex items-center">
            {stepIdx !== 0 && (
              <div className="flex items-center">
                <div className={`w-5 h-px ${step.isCompleted ? 'bg-primary-600' : 'bg-gray-300'}`} />
              </div>
            )}
            <div className="relative flex items-center">
              <div
                className={`
                  relative w-8 h-8 flex items-center justify-center rounded-full border-2 
                  ${step.isCompleted 
                    ? 'bg-primary-600 border-primary-600 text-white' 
                    : step.isActive 
                      ? 'border-primary-600 text-primary-600 bg-white' 
                      : 'border-gray-300 text-gray-500 bg-white'
                  }
                `}
              >
                {step.isCompleted ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="absolute top-10 left-1/2 transform -translate-x-1/2">
                <div className="text-xs font-medium text-gray-900 whitespace-nowrap">{step.title}</div>
              </div>
            </div>
            {stepIdx !== steps.length - 1 && (
              <div className="flex items-center">
                <div className={`w-5 h-px ${steps[stepIdx + 1].isCompleted ? 'bg-primary-600' : 'bg-gray-300'}`} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );

  const renderTemplateSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Choose a Template</h3>
        <p className="text-sm text-gray-500">
          Select a project template to get started quickly, or create a blank project
        </p>
      </div>

      {templatesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-32"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Blank Template */}
          <div
            className={`
              relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200
              ${!selectedTemplate 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
            onClick={() => {
              setSelectedTemplate(null);
              setValue('templateId', undefined);
              setValue('name', '');
              setValue('description', '');
            }}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">Blank Project</p>
                <p className="text-sm text-gray-500">Start from scratch</p>
              </div>
              {!selectedTemplate && (
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Template Options */}
          {templates.map((template) => (
            <div
              key={template.id}
              className={`
                relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200
                ${selectedTemplate?.id === template.id 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
              onClick={() => handleTemplateSelect(template)}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">{template.name}</p>
                  <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {template.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {template.estimatedDuration} days
                    </span>
                  </div>
                </div>
                {selectedTemplate?.id === template.id && (
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProjectDetails = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Project Details</h3>
        <p className="text-sm text-gray-500">
          Provide basic information about your project
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <FormField
          {...register('name', validationRules.name)}
          label="Project Name"
          placeholder="Enter project name"
          error={errors.name}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            {...register('description')}
            rows={4}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            placeholder="Describe your project objectives and scope"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority <span className="text-red-500">*</span>
            </label>
            <select
              {...register('priority', { required: 'Priority is required' })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value={Priority.LOW}>Low</option>
              <option value={Priority.MEDIUM}>Medium</option>
              <option value={Priority.HIGH}>High</option>
              <option value={Priority.CRITICAL}>Critical</option>
            </select>
            {errors.priority && (
              <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
            )}
          </div>

          <FormField
            {...register('budget', {
              valueAsNumber: true,
              min: { value: 0, message: 'Budget must be positive' }
            })}
            type="number"
            label="Budget (optional)"
            placeholder="0.00"
            error={errors.budget}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            {...register('startDate')}
            type="date"
            label="Start Date"
            error={errors.startDate}
          />

          <FormField
            {...register('endDate')}
            type="date"
            label="End Date (optional)"
            error={errors.endDate}
          />
        </div>
      </div>
    </div>
  );

  const renderConfiguration = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Project Configuration</h3>
        <p className="text-sm text-gray-500">
          Configure advanced settings for your project
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Advanced Configuration
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Advanced project settings like working calendars, team assignments, and dependency types will be configurable after project creation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReview = () => {
    const formData = watch();
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Review & Create</h3>
          <p className="text-sm text-gray-500">
            Review your project details before creating
          </p>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Project Summary</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Project details and configuration.</p>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Template</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {selectedTemplate ? selectedTemplate.name : 'Blank Project'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Project Name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formData.name || 'Not specified'}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {formData.description || 'No description provided'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Priority</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    formData.priority === Priority.CRITICAL ? 'bg-red-100 text-red-800' :
                    formData.priority === Priority.HIGH ? 'bg-orange-100 text-orange-800' :
                    formData.priority === Priority.MEDIUM ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {formData.priority}
                  </span>
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Timeline</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {formData.startDate && new Date(formData.startDate).toLocaleDateString()}
                  {formData.endDate && ` - ${new Date(formData.endDate).toLocaleDateString()}`}
                </dd>
              </div>
              {formData.budget && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Budget</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    ${formData.budget.toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {createProjectMutation.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error creating project</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{createProjectMutation.error.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderTemplateSelection();
      case 2:
        return renderProjectDetails();
      case 3:
        return renderConfiguration();
      case 4:
        return renderReview();
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Create New Project
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Follow the steps below to create a new project
          </p>
        </div>

        {renderStepIndicator()}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {renderStepContent()}
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              {currentStep === 4 ? (
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createProjectMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Next
                </button>
              )}
              
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Previous
                </button>
              )}
              
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};