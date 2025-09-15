import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UserCircleIcon,
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  ChatBubbleLeftRightIcon,
  LockClosedIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

// Types for collaborative features
export interface CollaborativeUser {
  id: string;
  name: string;
  avatar?: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  isOnline: boolean;
  lastSeen?: Date;
  currentTask?: string | number;
  cursor?: {
    x: number;
    y: number;
    taskId?: string | number;
  };
}

export interface TaskLock {
  taskId: string | number;
  userId: string;
  userName: string;
  lockedAt: Date;
  expiresAt: Date;
}

export interface ChangeNotification {
  id: string;
  type: 'task_updated' | 'dependency_added' | 'dependency_removed' | 'task_locked' | 'baseline_created';
  userId: string;
  userName: string;
  timestamp: Date;
  data: {
    taskId?: string | number;
    taskName?: string;
    fieldChanged?: string;
    oldValue?: any;
    newValue?: any;
    dependencyInfo?: {
      from: string | number;
      to: string | number;
    };
  };
  isRead: boolean;
}

export interface ConflictResolution {
  id: string;
  taskId: string | number;
  conflictType: 'concurrent_edit' | 'dependency_conflict' | 'date_overlap';
  users: CollaborativeUser[];
  changes: Array<{
    userId: string;
    timestamp: Date;
    changes: any;
  }>;
  status: 'pending' | 'resolved' | 'dismissed';
  resolution?: {
    selectedChanges: string; // userId of selected changes
    resolvedBy: string;
    resolvedAt: Date;
  };
}

interface CollaborativeFeaturesProps {
  projectId: string;
  currentUser: CollaborativeUser;
  onUserPresenceUpdate?: (users: CollaborativeUser[]) => void;
  onTaskLock?: (taskId: string | number, lock: boolean) => void;
  onConflictResolved?: (conflictId: string, resolution: any) => void;
}

interface UserPresenceProps {
  users: CollaborativeUser[];
  currentUser: CollaborativeUser;
  maxVisible?: number;
}

interface NotificationPanelProps {
  notifications: ChangeNotification[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  isVisible: boolean;
  onClose: () => void;
}

interface ConflictDialogProps {
  conflict: ConflictResolution;
  onResolve: (conflictId: string, selectedUserId: string) => void;
  onDismiss: (conflictId: string) => void;
  isVisible: boolean;
}

// User Presence Component
export const UserPresence: React.FC<UserPresenceProps> = ({
  users,
  currentUser,
  maxVisible = 5
}) => {
  const activeUsers = users.filter(u => u.isOnline && u.id !== currentUser.id);
  const visibleUsers = activeUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, activeUsers.length - maxVisible);

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-500';
      case 'editor': return 'bg-blue-500';
      case 'viewer': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  if (activeUsers.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <UserCircleIcon className="h-5 w-5" />
        <span>Working alone</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <UserGroupIcon className="h-5 w-5 text-gray-600" />
      <div className="flex items-center space-x-1">
        {visibleUsers.map(user => (
          <div
            key={user.id}
            className="relative group cursor-pointer"
            title={`${user.name} (${user.role})`}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className={`w-8 h-8 rounded-full border-2 ${getRoleColor(user.role)} border-opacity-50`}
              />
            ) : (
              <div className={`w-8 h-8 rounded-full ${getRoleColor(user.role)} flex items-center justify-center text-white text-xs font-medium`}>
                {getUserInitials(user.name)}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
              {user.name}
              {user.currentTask && (
                <div className="text-gray-300">Editing task {user.currentTask}</div>
              )}
            </div>
          </div>
        ))}
        
        {hiddenCount > 0 && (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium">
            +{hiddenCount}
          </div>
        )}
      </div>
      
      <span className="text-sm text-gray-600">
        {activeUsers.length} collaborator{activeUsers.length !== 1 ? 's' : ''}
      </span>
    </div>
  );
};

// Notification Panel Component
export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  isVisible,
  onClose
}) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_updated':
        return <PencilIcon className="h-4 w-4 text-blue-500" />;
      case 'dependency_added':
      case 'dependency_removed':
        return <ChatBubbleLeftRightIcon className="h-4 w-4 text-green-500" />;
      case 'task_locked':
        return <LockClosedIcon className="h-4 w-4 text-yellow-500" />;
      case 'baseline_created':
        return <CheckCircleIcon className="h-4 w-4 text-purple-500" />;
      default:
        return <BellIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatNotificationMessage = (notification: ChangeNotification) => {
    switch (notification.type) {
      case 'task_updated':
        return `${notification.userName} updated "${notification.data.taskName}" - changed ${notification.data.fieldChanged}`;
      case 'dependency_added':
        return `${notification.userName} added dependency between tasks`;
      case 'dependency_removed':
        return `${notification.userName} removed dependency between tasks`;
      case 'task_locked':
        return `${notification.userName} is editing "${notification.data.taskName}"`;
      case 'baseline_created':
        return `${notification.userName} created a new project baseline`;
      default:
        return `${notification.userName} made changes to the project`;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 top-20 z-50 mx-4 sm:mx-6 lg:mx-8">
      <div className="max-w-md ml-auto">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  ×
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 ${!notification.isRead ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          {formatNotificationMessage(notification)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <button
                          onClick={() => onMarkAsRead(notification.id)}
                          className="text-blue-600 hover:text-blue-700 text-xs"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Conflict Resolution Dialog
export const ConflictDialog: React.FC<ConflictDialogProps> = ({
  conflict,
  onResolve,
  onDismiss,
  isVisible
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />
        
        <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center space-x-3 mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900">Resolve Conflict</h3>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">
              Multiple users made conflicting changes to the same task. Please choose which changes to keep:
            </p>
            
            <div className="space-y-3">
              {conflict.changes.map((change, index) => {
                const user = conflict.users.find(u => u.id === change.userId);
                return (
                  <label
                    key={change.userId}
                    className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="conflictResolution"
                      value={change.userId}
                      checked={selectedUserId === change.userId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">{user?.name}</span>
                        <span className="text-xs text-gray-500">
                          {change.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <pre className="whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded">
                          {JSON.stringify(change.changes, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => onDismiss(conflict.id)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Dismiss
            </button>
            <button
              onClick={() => onResolve(conflict.id, selectedUserId)}
              disabled={!selectedUserId}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Collaborative Features Hook
export const useCollaborativeFeatures = ({
  projectId,
  currentUser,
  onUserPresenceUpdate,
  onTaskLock,
  onConflictResolved
}: CollaborativeFeaturesProps) => {
  const [collaborativeUsers, setCollaborativeUsers] = useState<CollaborativeUser[]>([currentUser]);
  const [taskLocks, setTaskLocks] = useState<TaskLock[]>([]);
  const [notifications, setNotifications] = useState<ChangeNotification[]>([]);
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Simulate WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      setIsConnected(true);
      
      // Simulate initial user presence
      const initialUsers: CollaborativeUser[] = [
        currentUser,
        {
          id: 'user-2',
          name: 'Sarah Johnson',
          email: 'sarah@example.com',
          role: 'editor',
          isOnline: true,
          currentTask: 'task-1'
        },
        {
          id: 'user-3',
          name: 'Mike Chen',
          email: 'mike@example.com',
          role: 'viewer',
          isOnline: true,
          lastSeen: new Date()
        }
      ];
      
      setCollaborativeUsers(initialUsers);
      onUserPresenceUpdate?.(initialUsers);

      // Simulate notifications
      setTimeout(() => {
        const sampleNotifications: ChangeNotification[] = [
          {
            id: 'notif-1',
            type: 'task_updated',
            userId: 'user-2',
            userName: 'Sarah Johnson',
            timestamp: new Date(Date.now() - 300000), // 5 minutes ago
            data: {
              taskId: 'task-1',
              taskName: 'Database Setup',
              fieldChanged: 'end date',
              oldValue: '2024-01-15',
              newValue: '2024-01-18'
            },
            isRead: false
          },
          {
            id: 'notif-2',
            type: 'dependency_added',
            userId: 'user-3',
            userName: 'Mike Chen',
            timestamp: new Date(Date.now() - 600000), // 10 minutes ago
            data: {
              dependencyInfo: {
                from: 'task-2',
                to: 'task-3'
              }
            },
            isRead: true
          }
        ];
        
        setNotifications(sampleNotifications);
      }, 2000);
    };

    connectWebSocket();

    return () => {
      setIsConnected(false);
    };
  }, [projectId, currentUser, onUserPresenceUpdate]);

  const lockTask = useCallback(async (taskId: string | number): Promise<boolean> => {
    // Check if task is already locked
    const existingLock = taskLocks.find(lock => lock.taskId === taskId);
    if (existingLock && existingLock.userId !== currentUser.id) {
      return false; // Task is locked by another user
    }

    const newLock: TaskLock = {
      taskId,
      userId: currentUser.id,
      userName: currentUser.name,
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + 300000) // 5 minutes
    };

    setTaskLocks(prev => [...prev.filter(lock => lock.taskId !== taskId), newLock]);
    onTaskLock?.(taskId, true);
    return true;
  }, [taskLocks, currentUser, onTaskLock]);

  const unlockTask = useCallback((taskId: string | number) => {
    setTaskLocks(prev => prev.filter(lock => !(lock.taskId === taskId && lock.userId === currentUser.id)));
    onTaskLock?.(taskId, false);
  }, [currentUser.id, onTaskLock]);

  const addNotification = useCallback((notification: Omit<ChangeNotification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotification: ChangeNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      timestamp: new Date(),
      isRead: false
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const resolveConflict = useCallback((conflictId: string, selectedUserId: string) => {
    const conflict = conflicts.find(c => c.id === conflictId);
    if (conflict) {
      const resolution = {
        selectedChanges: selectedUserId,
        resolvedBy: currentUser.id,
        resolvedAt: new Date()
      };
      
      setConflicts(prev => prev.map(c => 
        c.id === conflictId 
          ? { ...c, status: 'resolved' as const, resolution }
          : c
      ));
      
      onConflictResolved?.(conflictId, resolution);
    }
  }, [conflicts, currentUser.id, onConflictResolved]);

  const dismissConflict = useCallback((conflictId: string) => {
    setConflicts(prev => prev.map(c => 
      c.id === conflictId 
        ? { ...c, status: 'dismissed' as const }
        : c
    ));
  }, []);

  return {
    collaborativeUsers,
    taskLocks,
    notifications,
    conflicts: conflicts.filter(c => c.status === 'pending'),
    isConnected,
    lockTask,
    unlockTask,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    resolveConflict,
    dismissConflict
  };
};

export default useCollaborativeFeatures;