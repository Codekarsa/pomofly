# Health Check Endpoints

Pomofly provides comprehensive health check endpoints for monitoring and observability in production environments.

## Available Endpoints

### 1. Basic Health Check
**Endpoint**: `GET /api/health`

Simple health check endpoint for basic monitoring and load balancers.

**Response (200 OK)**:
```json
{
  "status": "healthy",
  "timestamp": "2024-03-15T02:00:00.000Z",
  "service": "pomofly",
  "version": "1.0.0",
  "uptime": 3600.5,
  "environment": "production"
}
```

**Response (503 Service Unavailable)**:
```json
{
  "status": "unhealthy",
  "timestamp": "2024-03-15T02:00:00.000Z",
  "service": "pomofly",
  "error": "Service error description"
}
```

### 2. Detailed Health Check
**Endpoint**: `GET /api/health/detailed`

Comprehensive health check with dependency validation for detailed monitoring.

**Response (200 OK)**:
```json
{
  "status": "healthy",
  "timestamp": "2024-03-15T02:00:00.000Z",
  "service": "pomofly",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 3600.5,
  "checks": [
    {
      "name": "firebase_auth",
      "status": "healthy",
      "responseTime": 15,
      "details": {
        "configured": true,
        "currentUser": "anonymous"
      }
    },
    {
      "name": "firestore",
      "status": "healthy",
      "responseTime": 120,
      "details": {
        "connected": true,
        "testDocExists": false
      }
    },
    {
      "name": "claude_api",
      "status": "healthy",
      "responseTime": 5,
      "details": {
        "configured": true,
        "model": "claude-3-sonnet-20240229",
        "apiKeyConfigured": true
      }
    },
    {
      "name": "environment_variables",
      "status": "healthy",
      "responseTime": 2,
      "details": {
        "required": 8,
        "present": 8,
        "missing": 0,
        "missingVars": []
      }
    },
    {
      "name": "memory_usage",
      "status": "healthy",
      "responseTime": 1,
      "details": {
        "heapUsed": "45MB",
        "heapTotal": "67MB",
        "rss": "89MB",
        "external": "12MB",
        "heapUsagePercent": 67
      }
    }
  ],
  "summary": {
    "total": 5,
    "healthy": 5,
    "unhealthy": 0,
    "degraded": 0
  }
}
```

**Health Check Status**:
- `healthy`: All systems operational
- `degraded`: Some systems slow or partially functional
- `unhealthy`: Critical systems failing

### 3. Kubernetes Readiness Probe
**Endpoint**: `GET /api/health/ready`

Fast readiness check for Kubernetes to determine if the service can receive traffic.

**Response (200 OK)**:
```json
{
  "ready": true,
  "timestamp": "2024-03-15T02:00:00.000Z",
  "service": "pomofly",
  "checks": {
    "firebase": { "ready": true },
    "environment": { "ready": true }
  }
}
```

**Response (503 Service Unavailable)**:
```json
{
  "ready": false,
  "timestamp": "2024-03-15T02:00:00.000Z",
  "service": "pomofly",
  "checks": {
    "firebase": { 
      "ready": false, 
      "error": "Firebase instances not initialized" 
    },
    "environment": { "ready": true }
  }
}
```

### 4. Kubernetes Liveness Probe
**Endpoint**: `GET /api/health/live`

Minimal liveness check for Kubernetes to determine if the service needs restart.

**Response (200 OK)**:
```json
{
  "alive": true,
  "timestamp": "2024-03-15T02:00:00.000Z",
  "service": "pomofly",
  "uptime": 3600.5,
  "pid": 1234,
  "nodeVersion": "v18.17.0",
  "platform": "linux",
  "arch": "x64"
}
```

## Kubernetes Integration

### Deployment Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pomofly
spec:
  template:
    spec:
      containers:
      - name: pomofly
        image: pomofly:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /api/health/live
            port: 3000
            scheme: HTTP
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 3000
            scheme: HTTP
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        env:
        - name: NODE_ENV
          value: "production"
        # ... other environment variables
```

### Service Configuration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: pomofly-service
spec:
  selector:
    app: pomofly
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Load Balancer Integration

### NGINX Configuration

```nginx
upstream pomofly {
    server pomofly-1:3000 max_fails=2 fail_timeout=10s;
    server pomofly-2:3000 max_fails=2 fail_timeout=10s;
    server pomofly-3:3000 max_fails=2 fail_timeout=10s;
}

server {
    listen 80;
    server_name pomofly.com;

    # Health check for load balancer
    location /api/health {
        proxy_pass http://pomofly;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
        
        # Don't cache health checks
        proxy_cache off;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Regular application traffic
    location / {
        proxy_pass http://pomofly;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### HAProxy Configuration

```haproxy
backend pomofly_backend
    balance roundrobin
    option httpchk GET /api/health
    http-check expect status 200
    
    server pomofly-1 pomofly-1:3000 check inter 10s fall 2 rise 3
    server pomofly-2 pomofly-2:3000 check inter 10s fall 2 rise 3
    server pomofly-3 pomofly-3:3000 check inter 10s fall 2 rise 3
```

## Monitoring System Integration

### Prometheus Configuration

```yaml
- job_name: 'pomofly-health'
  static_configs:
    - targets: ['pomofly.com:80']
  metrics_path: '/api/health/detailed'
  scrape_interval: 30s
  scrape_timeout: 10s
  params:
    format: ['prometheus']  # If implemented
```

### DataDog Monitoring

```yaml
init_config:

instances:
  - name: pomofly_health
    url: https://pomofly.com/api/health/detailed
    timeout: 10
    method: get
    tags:
      - service:pomofly
      - env:production
    http_response_status_code: 200
```

### New Relic Synthetics

```javascript
// New Relic synthetic monitor script
const assert = require('assert');

$http.get('https://pomofly.com/api/health/detailed', {
  timeout: 10000
}, function(err, response, body) {
  assert.equal(response.statusCode, 200, 'Expected 200 status code');
  
  const health = JSON.parse(body);
  assert.equal(health.status, 'healthy', 'Service should be healthy');
  assert(health.summary.healthy > 0, 'At least one service should be healthy');
});
```

### Uptime Robot

**Monitor Type**: HTTP(s)
**URL**: `https://pomofly.com/api/health`
**Keyword Monitoring**: `"status":"healthy"`
**Check Interval**: 5 minutes

## Response Time Guidelines

| Endpoint | Target Response Time | Timeout |
|----------|---------------------|---------|
| `/api/health` | < 100ms | 1s |
| `/api/health/ready` | < 200ms | 3s |
| `/api/health/live` | < 50ms | 1s |
| `/api/health/detailed` | < 2s | 10s |

## Troubleshooting

### Common Issues

1. **503 Response from `/api/health/ready`**
   - Check Firebase configuration
   - Verify environment variables are set
   - Check application logs for startup errors

2. **Slow Response from `/api/health/detailed`**
   - Firebase connectivity issues
   - High memory usage (check system resources)
   - Network latency to external services

3. **Memory Warnings in Detailed Health**
   - Monitor heap usage over time
   - Check for memory leaks in application
   - Consider increasing container memory limits

### Alerting Rules

```yaml
# Example Prometheus alerting rules
groups:
- name: pomofly_health
  rules:
  - alert: PomoflyServiceDown
    expr: up{job="pomofly-health"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Pomofly service is down"
      description: "Pomofly service has been down for more than 1 minute"

  - alert: PomoflyUnhealthy
    expr: pomofly_health_status != 1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Pomofly service is unhealthy"
      description: "Pomofly service health check is failing"
```

## Security Considerations

- Health check endpoints are **public** and don't require authentication
- They don't expose sensitive configuration details
- API keys are verified for presence but not displayed
- Consider restricting access using network policies in production
- Monitor for abuse of health check endpoints