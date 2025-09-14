import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Role } from '../../types';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const getRoleBasedContent = () => {
    switch (user?.role) {
      case Role.PMO:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900">Portfolio Overview</h3>
              <p className="mt-2 text-sm text-gray-600">Manage all projects across the organization</p>
            </div>
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900">Resource Management</h3>
              <p className="mt-2 text-sm text-gray-600">Allocate resources across projects</p>
            </div>
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900">Analytics & Reports</h3>
              <p className="mt-2 text-sm text-gray-600">View organizational insights</p>
            </div>
          </div>
        );
      case Role.PM:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900">My Projects</h3>
              <p className="mt-2 text-sm text-gray-600">Manage projects you're leading</p>
            </div>
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900">Team Performance</h3>
              <p className="mt-2 text-sm text-gray-600">Track team progress and performance</p>
            </div>
          </div>
        );
      case Role.TEAM_MEMBER:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900">My Tasks</h3>
              <p className="mt-2 text-sm text-gray-600">View and update assigned tasks</p>
            </div>
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900">Time Tracking</h3>
              <p className="mt-2 text-sm text-gray-600">Log time spent on activities</p>
            </div>
          </div>
        );
      case Role.CLIENT:
        return (
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900">Project Progress</h3>
            <p className="mt-2 text-sm text-gray-600">View progress on your projects</p>
          </div>
        );
      default:
        return (
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900">Welcome</h3>
            <p className="mt-2 text-sm text-gray-600">Access your dashboard</p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="mt-2 text-gray-600">
          Here's what's happening with your projects
        </p>
      </div>
      
      {getRoleBasedContent()}
    </div>
  );
};