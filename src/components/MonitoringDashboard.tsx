'use client';
import React, { useState, useEffect } from 'react';
import { useMonitoring } from '@/hooks/useMonitoring';
import { monitoring, ErrorReport, PerformanceMetric } from '@/lib/monitoring';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Clock,
  Download,
  RefreshCw,
  Trash2,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react';

interface MonitoringDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  isOpen,
  onClose,
}) => {
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { getMonitoringSummary } = useMonitoring();

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen, refreshKey]);

  const refreshData = () => {
    const storedErrors = monitoring.getStoredErrors();
    const storedMetrics = monitoring.getStoredMetrics();
    const summaryData = getMonitoringSummary();

    setErrors(storedErrors);
    setMetrics(storedMetrics);
    setSummary(summaryData);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleClearData = () => {
    if (
      confirm(
        'Are you sure you want to clear all monitoring data? This action cannot be undone.'
      )
    ) {
      monitoring.clearStoredData();
      refreshData();
    }
  };

  const handleExportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      errors: errors,
      metrics: metrics,
      summary: summary,
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataUri =
      'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `pomofly-monitoring-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getMetricStats = () => {
    if (metrics.length === 0) return null;

    const performanceMetrics = metrics.filter((m) =>
      ['page_load_time', 'lcp', 'api_call_duration'].includes(m.metric)
    );

    if (performanceMetrics.length === 0) return null;

    const avgLoadTime =
      performanceMetrics
        .filter((m) => m.metric === 'page_load_time')
        .reduce((sum, m) => sum + m.value, 0) /
      performanceMetrics.filter((m) => m.metric === 'page_load_time').length;

    const apiCalls = metrics.filter((m) => m.metric === 'api_call_duration');
    const avgApiTime =
      apiCalls.reduce((sum, m) => sum + m.value, 0) / apiCalls.length;

    return {
      avgLoadTime: avgLoadTime || 0,
      avgApiTime: avgApiTime || 0,
      totalApiCalls: apiCalls.length,
    };
  };

  const stats = getMetricStats();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="border-b bg-gray-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Monitoring Dashboard
              </h2>
              <p className="text-sm text-gray-600">
                Performance metrics and error tracking
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="mr-1 h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportData}>
                <Download className="mr-1 h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearData}>
                <Trash2 className="mr-1 h-4 w-4" />
                Clear
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                ×
              </Button>
            </div>
          </div>
        </div>

        <div className="max-h-[calc(90vh-120px)] overflow-y-auto p-6">
          {/* Summary Cards */}
          {summary && (
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <User className="h-8 w-8 text-blue-500" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">
                        Session
                      </p>
                      <p className="text-lg font-semibold">
                        {formatDuration(summary.sessionDuration)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">
                        Errors
                      </p>
                      <p className="text-lg font-semibold">{errors.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <BarChart3 className="h-8 w-8 text-green-500" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">
                        Metrics
                      </p>
                      <p className="text-lg font-semibold">{metrics.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">
                        Avg Load
                      </p>
                      <p className="text-lg font-semibold">
                        {stats ? formatDuration(stats.avgLoadTime) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent Errors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="mr-2 h-5 w-5 text-red-500" />
                  Recent Errors ({errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-80 overflow-y-auto">
                {errors.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No errors recorded in this session.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {errors
                      .slice(-10)
                      .reverse()
                      .map((error, index) => (
                        <div
                          key={error.id || index}
                          className="rounded-lg border bg-gray-50 p-3"
                        >
                          <div className="mb-2 flex items-start justify-between">
                            <span className="text-sm font-medium">
                              {error.error.name}
                            </span>
                            <Badge className={getSeverityColor(error.severity)}>
                              {error.severity}
                            </Badge>
                          </div>
                          <p className="mb-2 text-sm text-gray-600">
                            {error.error.message}
                          </p>
                          <div className="text-xs text-gray-500">
                            <p>
                              Component: {error.context.component || 'Unknown'}
                            </p>
                            <p>Action: {error.context.action || 'Unknown'}</p>
                            <p>
                              Time:{' '}
                              {new Date(error.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          {error.context.tags &&
                            error.context.tags.length > 0 && (
                              <div className="mt-2 flex gap-1">
                                {error.context.tags.map((tag, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5 text-blue-500" />
                  Performance Metrics ({metrics.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-80 overflow-y-auto">
                {metrics.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No performance metrics recorded yet.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {metrics
                      .slice(-15)
                      .reverse()
                      .map((metric, index) => (
                        <div
                          key={metric.id || index}
                          className="rounded-lg border bg-gray-50 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {metric.metric}
                            </span>
                            <div className="flex items-center text-sm">
                              <Clock className="mr-1 h-4 w-4 text-gray-500" />
                              {(typeof metric.value === 'number' &&
                                metric.metric.includes('time')) ||
                              metric.metric.includes('duration')
                                ? formatDuration(metric.value)
                                : metric.value}
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            <p>Route: {metric.context.route}</p>
                            <p>
                              Time:{' '}
                              {new Date(metric.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          {metric.tags && metric.tags.length > 0 && (
                            <div className="mt-2 flex gap-1">
                              {metric.tags.slice(0, 3).map((tag, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {metric.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{metric.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Session Info */}
          {summary && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="mr-2 h-5 w-5 text-yellow-500" />
                  Session Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                  <div>
                    <p className="font-medium text-gray-600">Session ID</p>
                    <p className="font-mono text-xs">{summary.sessionId}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">User ID</p>
                    <p className="font-mono text-xs">
                      {summary.userId || 'Anonymous'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">
                      Session Duration
                    </p>
                    <p>{formatDuration(summary.sessionDuration)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
