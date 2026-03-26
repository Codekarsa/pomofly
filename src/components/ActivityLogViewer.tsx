'use client'

import React, { useState, useEffect } from 'react';
import { ActivityLog, ActivityLogger, ActivityTypes } from '@/lib/activityLogger';
import { useAuth } from '@/app/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLogViewerProps {
  className?: string;
  limit?: number;
  showFilters?: boolean;
}

export const ActivityLogViewer: React.FC<ActivityLogViewerProps> = ({
  className = '',
  limit = 50,
  showFilters = true
}) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const activityLogger = ActivityLogger.getInstance();

  useEffect(() => {
    if (!user) return;

    const loadActivityLogs = async () => {
      setLoading(true);
      setError(null);

      try {
        const options = {
          limit,
          ...(filterType !== 'all' && { activityType: filterType as any }),
        };

        const activityLogs = await activityLogger.getUserActivityLogs(user.uid, options);
        setLogs(activityLogs);
      } catch (err) {
        console.error('Failed to load activity logs:', err);
        setError('Failed to load activity logs');
      } finally {
        setLoading(false);
      }
    };

    loadActivityLogs();
  }, [user, limit, filterType]);

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const getActivityTypeDisplay = (activityType: string) => {
    return activityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActivityIcon = (activityType: string) => {
    if (activityType.includes('task')) return '📝';
    if (activityType.includes('timer')) return '⏱️';
    if (activityType.includes('project')) return '📁';
    if (activityType.includes('user')) return '👤';
    return '📋';
  };

  if (!user) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        Please log in to view activity logs.
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Activity Log</h3>
        {showFilters && (
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Activities</option>
            <option value={ActivityTypes.USER_LOGIN}>Login Events</option>
            <option value={ActivityTypes.TASK_CREATED}>Task Created</option>
            <option value={ActivityTypes.TASK_UPDATED}>Task Updated</option>
            <option value={ActivityTypes.TASK_COMPLETED}>Task Completed</option>
            <option value={ActivityTypes.TIMER_STARTED}>Timer Started</option>
            <option value={ActivityTypes.TIMER_COMPLETED}>Timer Completed</option>
          </select>
        )}
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-2">Loading activity logs...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="p-4 text-center text-gray-500">
          No activity logs found.
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <div className="space-y-2">
          {logs.map((log) => {
            const isExpanded = expandedLogs.has(log.id!);
            
            return (
              <div
                key={log.id}
                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <div 
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => toggleLogExpansion(log.id!)}
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="text-lg">{getActivityIcon(log.activityType)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {getActivityTypeDisplay(log.activityType)}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                      </p>
                      
                      {log.resourceId && (
                        <p className="text-xs text-gray-400 mt-1">
                          Resource: {log.resourceType}/{log.resourceId}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <button className="text-gray-400 hover:text-gray-600">
                    {isExpanded ? '−' : '+'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Session ID:</span>{' '}
                      <span className="font-mono text-xs">{log.sessionId}</span>
                    </div>
                    
                    {log.metadata && (
                      <div>
                        <span className="font-medium text-sm">Metadata:</span>
                        <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {log.beforeValue && (
                      <div>
                        <span className="font-medium text-sm">Before:</span>
                        <pre className="mt-1 text-xs bg-red-50 p-2 rounded overflow-auto">
                          {JSON.stringify(log.beforeValue, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {log.afterValue && (
                      <div>
                        <span className="font-medium text-sm">After:</span>
                        <pre className="mt-1 text-xs bg-green-50 p-2 rounded overflow-auto">
                          {JSON.stringify(log.afterValue, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};