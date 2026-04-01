# Health Check Endpoints

Production-ready health check system for monitoring application status, database connectivity, and external service availability.

## Available Endpoints

### 1. Main Health Check - `/api/health`

Comprehensive health check that validates all system components.

**Usage:**
```bash
# Basic health check
curl https://your-domain.com/api/health

# Detailed health check with full error information
curl https://your-domain.com/api/health?detailed=true

# Check specific service only
curl https://your-domain.com/api/health?service=database
```

**Services Checked:**
- **Database**: Firebase Firestore connectivity
- **Claude API**: AI service availability and authentication
- **Core App**: Node.js process health and memory usage
- **Monitoring**: External monitoring service connectivity

**Response Format:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-04-01T03:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "environment": "production",
  "services": [
    {
      "service": "database",
      "status": "healthy",
      "responseTime": 45,
      "details": "Firestore connection successful"
    }
  ],
  "summary": {
    "total": 4,
    "healthy": 3,
    "degraded": 1,
    "unhealthy": 0
  }
}
```

**HTTP Status Codes:**
- `200`: All services healthy or degraded
- `503`: One or more services unhealthy

### 2. Readiness Probe - `/api/health/ready`

Kubernetes-style readiness probe that checks if the application is ready to serve traffic.

**Usage:**
```bash
curl https://your-domain.com/api/health/ready
```

**Checks:**
- Firebase configuration is complete
- Required environment variables are set
- Essential services are properly configured

**Response:**
```json
{
  "status": "ready|not_ready",
  "timestamp": "2024-04-01T03:00:00.000Z",
  "checks": [
    {
      "service": "firebase",
      "ready": true
    },
    {
      "service": "environment",
      "ready": true
    }
  ]
}
```

**HTTP Status Codes:**
- `200`: Application ready to serve traffic
- `503`: Application not ready

### 3. Liveness Probe - `/api/health/live`

Lightweight liveness check that verifies the application is alive and responsive.

**Usage:**
```bash
curl https://your-domain.com/api/health/live
```

**Checks:**
- Process health (PID, Node.js version)
- Memory usage within acceptable limits
- Event loop responsiveness

**Response:**
```json
{
  "status": "alive|unhealthy|dead",
  "timestamp": "2024-04-01T03:00:00.000Z",
  "uptime": 3600,
  "responseTime": 15,
  "checks": [
    {
      "check": "process",
      "healthy": true,
      "details": "PID 1234, Node.js v18.0.0 on linux"
    }
  ]
}
```

**HTTP Status Codes:**
- `200`: Application is alive
- `503`: Application is unresponsive or dead

### 4. Metrics Endpoint - `/api/health/metrics`

Detailed application metrics for monitoring and observability.

**Usage:**
```bash
# JSON format (default)
curl https://your-domain.com/api/health/metrics

# Prometheus format
curl https://your-domain.com/api/health/metrics?format=prometheus
```

**JSON Response:**
```json
{
  "timestamp": "2024-04-01T03:00:00.000Z",
  "uptime": 3600,
  "process": {
    "pid": 1234,
    "version": "v18.0.0",
    "platform": "linux",
    "arch": "x64"
  },
  "memory": {
    "rss": 104857600,
    "heapTotal": 83886080,
    "heapUsed": 67108864,
    "heapUsedPercent": 80
  },
  "configuration": {
    "firebaseConfigured": true,
    "claudeApiConfigured": true,
    "monitoringEnabled": false
  },
  "health": {
    "status": "healthy",
    "lastCheck": "2024-04-01T03:00:00.000Z"
  }
}
```

**Prometheus Format:**
```
# HELP app_uptime_seconds Application uptime in seconds
# TYPE app_uptime_seconds counter
app_uptime_seconds 3600 1711929600000

# HELP app_memory_heap_used_bytes Used heap memory
# TYPE app_memory_heap_used_bytes gauge
app_memory_heap_used_bytes 67108864 1711929600000
```

## Load Balancer Integration

All endpoints support `HEAD` requests for simple health checks:

```bash
# Quick liveness check
curl -I https://your-domain.com/api/health/live

# Quick readiness check  
curl -I https://your-domain.com/api/health/ready
```

## Kubernetes Configuration

### Deployment with Health Checks

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pomofly
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pomofly
  template:
    metadata:
      labels:
        app: pomofly
    spec:
      containers:
      - name: app
        image: pomofly:latest
        ports:
        - containerPort: 3000
        
        # Liveness probe - restart container if this fails
        livenessProbe:
          httpGet:
            path: /api/health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        
        # Readiness probe - remove from service if this fails
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 2
```

### Service Configuration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: pomofly-service
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/path: "/api/health/metrics"
    prometheus.io/port: "3000"
spec:
  selector:
    app: pomofly
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Monitoring Integration

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'pomofly'
    static_configs:
      - targets: ['pomofly-service:80']
    metrics_path: '/api/health/metrics'
    params:
      format: ['prometheus']
```

### Grafana Dashboard Queries

**Memory Usage:**
```promql
app_memory_heap_used_percent{job="pomofly"}
```

**Request Response Time:**
```promql
rate(app_health_check_duration_seconds[5m])
```

**Service Health Status:**
```promql
app_health_status{job="pomofly"}
```

### Alerting Rules

```yaml
groups:
- name: pomofly.alerts
  rules:
  - alert: AppDown
    expr: app_health_status < 1
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Pomofly application unhealthy"
      
  - alert: HighMemoryUsage
    expr: app_memory_heap_used_percent > 85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage detected"
```

## Load Balancer Configuration

### nginx

```nginx
upstream pomofly_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://pomofly_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Health check for upstream servers
        proxy_next_upstream error timeout http_503;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://pomofly_backend/api/health/live;
        proxy_set_header Host $host;
    }
}
```

### HAProxy

```
backend pomofly_servers
    mode http
    balance roundrobin
    option httpchk HEAD /api/health/live HTTP/1.1\r\nHost:\ your-domain.com
    
    server app1 127.0.0.1:3000 check
    server app2 127.0.0.1:3001 check
    server app3 127.0.0.1:3002 check
```

## Troubleshooting

### Common Issues

1. **Database Connection Failures**
   ```bash
   # Check Firebase configuration
   curl https://your-domain.com/api/health?service=database
   ```

2. **Claude API Issues**
   ```bash
   # Check AI service status
   curl https://your-domain.com/api/health?service=claude-api
   ```

3. **Memory Issues**
   ```bash
   # Monitor memory usage
   curl https://your-domain.com/api/health/metrics | jq '.memory'
   ```

### Environment Variables

Required for full functionality:

```env
# Firebase (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project

# Claude AI (Optional but recommended for production)
CLAUDE_API_KEY=your-claude-key
CLAUDE_MODEL=claude-3-haiku-20240307

# Monitoring (Optional)
NEXT_PUBLIC_MONITORING_ENABLED=true
NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT=https://your-sentry-dsn
NEXT_PUBLIC_METRICS_ENDPOINT=https://your-metrics-endpoint
```

### Performance Considerations

- Health checks are cached for performance
- Liveness probes are lightweight (< 10ms typically)
- Readiness probes include configuration validation
- Full health checks may take 100-500ms depending on external services
- Metrics collection is non-blocking and cached

## Security Considerations

- Health check endpoints do not require authentication
- Sensitive information is not exposed in responses
- Rate limiting is applied to prevent abuse
- Error details are sanitized to prevent information disclosure