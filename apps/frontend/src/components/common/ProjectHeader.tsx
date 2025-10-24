// ABOUTME: Project header component - displays project info and quick actions
// ABOUTME: Shows project name, description, status, progress, and navigation tabs

import React from "react";
import { Link } from "react-router-dom";
import { Project } from "../../types";
import { StatusBadge, ProgressBar } from "./index";
import { Button } from "./Button";

interface ProjectHeaderProps {
  project: Project;
  tabs?: Array<{
    label: string;
    path: string;
    icon?: string;
  }>;
  activeTab?: string;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  tabs = [],
  activeTab,
}) => {
  const progress = project.progressPercentage || 0;

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Main Header */}
      <div className="px-6 py-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <StatusBadge status={project.status || "NOT_STARTED"} />
            </div>
            {project.description && (
              <p className="text-gray-600 text-base">{project.description}</p>
            )}
          </div>
          <div className="ml-6 text-right flex-shrink-0">
            {project.startDate && (
              <p className="text-sm text-gray-500">
                Start: {new Date(project.startDate).toLocaleDateString()}
              </p>
            )}
            {project.endDate && (
              <p className="text-sm text-gray-500 mt-1">
                End: {new Date(project.endDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 max-w-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-semibold text-gray-900">{progress}%</span>
          </div>
          <ProgressBar progress={progress} color="blue" />
        </div>
      </div>

      {/* Tab Navigation */}
      {tabs.length > 0 && (
        <div className="border-t border-gray-200 px-6">
          <nav className="flex gap-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={`py-4 px-0 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.path
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                {tab.icon && <span className="mr-2">{tab.icon}</span>}
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
};
