# Monitoring and Error Tracking

PomoFly includes comprehensive error tracking and performance monitoring to help maintain a reliable user experience and identify issues quickly.

## Features

### 🐛 Error Tracking

- **Global Error Handling**: Catches unhandled JavaScript errors and promise rejections
- **React Error Boundaries**: Graceful error handling in React components
- **API Error Monitoring**: Tracks API call failures with detailed context
- **User Context**: Associates errors with user sessions and actions

### 📊 Performance Monitoring

- **Page Load Metrics**: Tracks page load times and Core Web Vitals
- **API Response Times**: Monitors API call durations
- **User Interactions**: Tracks button clicks and form submissions
- **Component Render Times**: Measures React component performance

### 🔍 User Analytics

- **Session Tracking**: Monitors user session duration and activities
- **Feature Usage**: Tracks which features are being used
- **Error Recovery**: Monitors how users recover from errors

## Implementation

### Error Boundaries

React Error Boundaries are implemented at strategic points:

```jsx
import {
  TimerErrorBoundary,
  TaskErrorBoundary,
} from '@/components/ErrorBoundary';

// Wrap components that might fail
<TimerErrorBoundary>
  <PomodoroTimer />
</TimerErrorBoundary>;
```

### Monitoring Hooks

Use monitoring hooks in your components:

```jsx
import {
  useMonitoring,
  useApiMonitoring,
  useFormMonitoring,
} from '@/hooks/useMonitoring';

function MyComponent() {
  const { reportError, trackAction } = useMonitoring();
  const { monitorApiCall } = useApiMonitoring();
  const { trackFormStart, trackFormSubmit } = useFormMonitoring('myForm');

  const handleAction = async () => {
    try {
      trackAction('button_click');
      const result = await monitorApiCall('/api/data', 'GET', fetchData);
      // Handle success
    } catch (error) {
      reportError(error, {
        component: 'MyComponent',
        action: 'data_fetch',
        severity: 'high',
      });
    }
  };
}
```

### Manual Error Reporting

Report errors with context:

```jsx
import { monitoring } from '@/lib/monitoring';

// Report an error with context
monitoring.reportError(new Error('Something went wrong'), {
  component: 'TaskList',
  action: 'task_creation',
  severity: 'medium',
  tags: ['user_action', 'task_management'],
});

// Record a performance metric
monitoring.recordMetric('task_creation_time', duration, [
  'performance',
  'user_action',
]);
```

## Data Storage

### Local Storage

- Errors and metrics are stored locally in the browser
- **Errors**: Last 50 errors are kept
- **Metrics**: Last 100 metrics are kept
- Data is automatically cleaned up to prevent storage bloat

### External Services (Optional)

Configure external monitoring services via environment variables:

```env
# Sentry for error tracking
NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT=https://your-sentry-dsn

# DataDog for metrics
NEXT_PUBLIC_METRICS_ENDPOINT=https://api.datadoghq.com/api/v1/series
```

## Monitoring Dashboard

### Development Access

In development mode, access the monitoring dashboard via the footer "Monitoring" link.

### Dashboard Features

- **Error Summary**: Recent errors with severity levels
- **Performance Metrics**: Response times and user interactions
- **Session Information**: User session details
- **Data Export**: Export monitoring data as JSON
- **Data Management**: Clear stored monitoring data

### Dashboard Sections

1. **Overview Cards**: Session duration, error count, metrics count
2. **Recent Errors**: Latest errors with context and stack traces
3. **Performance Metrics**: Recent performance measurements
4. **Session Info**: Current session details

## Configuration

### Environment Variables

```env
# Enable/disable monitoring
NEXT_PUBLIC_MONITORING_ENABLED=true

# Sample rate (0.0 - 1.0)
NEXT_PUBLIC_MONITORING_SAMPLE_RATE=1.0

# Debug mode
NEXT_PUBLIC_MONITORING_DEBUG=false
```

### Monitoring Service Class

The `MonitoringService` class provides the core functionality:

- **Error Reporting**: `reportError(error, context)`
- **Performance Tracking**: `recordMetric(metric, value, tags)`
- **Function Timing**: `timeFunction(name, fn, tags)`
- **Async Timing**: `timeAsyncFunction(name, fn, tags)`

## Integration with External Services

### Sentry Integration

```env
NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT=https://your-project@sentry.io/api/your-project-id/store/
```

### DataDog Integration

```env
NEXT_PUBLIC_METRICS_ENDPOINT=https://api.datadoghq.com/api/v1/series
```

### Custom Integration

Set your own endpoint:

```env
NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT=https://your-api.com/errors
NEXT_PUBLIC_METRICS_ENDPOINT=https://your-api.com/metrics
```

## API Endpoints

### Monitoring API

- `GET /api/monitoring?type=summary` - Get monitoring system status
- `GET /api/monitoring?type=health` - Health check endpoint
- `POST /api/monitoring` - Receive monitoring data (for external collection)

## Best Practices

### Error Handling

1. **Use Error Boundaries**: Wrap components that might fail
2. **Provide Context**: Include component name, action, and relevant data
3. **Set Appropriate Severity**: Critical, high, medium, or low
4. **Add Meaningful Tags**: Help categorize and filter errors

### Performance Monitoring

1. **Monitor Critical Paths**: API calls, user interactions, form submissions
2. **Track Key Metrics**: Page load times, API response times
3. **Use Tags**: Categorize metrics for better analysis
4. **Avoid Over-Monitoring**: Don't track every single action

### Privacy Considerations

1. **No Personal Data**: Never include personal information in error reports
2. **Sanitize Data**: Remove sensitive information before reporting
3. **User Consent**: Inform users about monitoring (privacy policy)
4. **Data Retention**: Automatic cleanup of stored data

## Troubleshooting

### Common Issues

1. **Monitoring not working**: Check if `NEXT_PUBLIC_MONITORING_ENABLED=true`
2. **External service errors**: Verify endpoint URLs and authentication
3. **Storage limits**: Data is automatically cleaned up, but check browser storage

### Debug Mode

Enable debug mode to see monitoring activity in console:

```env
NEXT_PUBLIC_MONITORING_DEBUG=true
```

### Health Check

Check monitoring system health:

```
GET /api/monitoring?type=health
```

## Development vs Production

### Development

- Full error details and stack traces
- Console logging enabled
- Monitoring dashboard accessible
- All errors and metrics tracked

### Production

- Sanitized error messages
- No console logging
- External service integration
- Sampling may be applied

This monitoring system provides comprehensive insights into application performance and reliability while maintaining user privacy and system performance.
