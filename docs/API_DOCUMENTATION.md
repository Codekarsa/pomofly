# API Documentation

This document describes the API documentation system implemented for Pomofly.

## Overview

Pomofly now includes comprehensive API documentation using OpenAPI 3.0 specification and Swagger UI for interactive testing.

## Features

- **OpenAPI 3.0 Specification**: Complete API documentation in industry-standard format
- **Interactive Swagger UI**: Test API endpoints directly from the documentation
- **Request/Response Examples**: Real-world examples for all endpoints
- **Schema Validation Documentation**: Detailed input/output validation rules
- **Error Code Documentation**: Complete error handling and status codes
- **Authentication Documentation**: Security requirements for each endpoint

## Accessing the Documentation

The API documentation is available at:
- **Development**: http://localhost:3000/api-docs
- **Production**: https://your-domain.com/api-docs

## Available Endpoints

### Claude Breakdown API (`/api/claude-breakdown`)

**Purpose**: Break down complex tasks into subtasks with estimated Pomodoro sessions using Claude AI.

**Method**: `POST`

**Authentication**: Required (Firebase JWT)

**Request Body**:
```json
{
  "description": "Create a responsive landing page for a new product",
  "startDate": "2024-03-01",
  "endDate": "2024-03-05",
  "pomodoroDuration": 25,
  "shortBreakDuration": 5,
  "longBreakDuration": 15
}
```

**Response**:
```json
{
  "tasks": [
    {
      "title": "Set up project structure and dependencies",
      "estimatedPomodoros": 2
    },
    {
      "title": "Design responsive layout and wireframes",
      "estimatedPomodoros": 3
    }
  ]
}
```

**Rate Limiting**: 5 requests per minute per user

**Validation Rules**:
- `description`: Required, 1-2000 characters
- `pomodoroDuration`: Optional, 1-120 minutes (default: 25)
- `shortBreakDuration`: Optional, 1-60 minutes (default: 5)
- `longBreakDuration`: Optional, 1-120 minutes (default: 15)

### Monitoring API (`/api/monitoring`)

**Purpose**: Health checks and monitoring data collection for system observability.

**Methods**: `GET`, `POST`

**Authentication**: Not required for basic health checks

#### GET - Health Checks

**Query Parameters**:
- `type`: Required - One of `errors`, `metrics`, `summary`, `health`
- `limit`: Optional - Number of items to return (1-1000, default: 50)

**Examples**:
- Health check: `/api/monitoring?type=health`
- System summary: `/api/monitoring?type=summary`
- Error examples: `/api/monitoring?type=errors&limit=10`

#### POST - Submit Monitoring Data

**Request Body**:
```json
{
  "type": "error",
  "data": {
    "id": "error-1699123456789-abc123",
    "timestamp": "2024-02-28T10:30:00.000Z",
    "error": {
      "name": "TypeError",
      "message": "Cannot read property of undefined"
    },
    "context": {
      "userId": "user123",
      "sessionId": "session-456",
      "route": "/dashboard"
    },
    "severity": "medium"
  }
}
```

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": "Additional error details",
  "code": "MACHINE_READABLE_CODE"
}
```

### Common HTTP Status Codes

- `200`: Success
- `400`: Bad Request - Invalid input parameters
- `401`: Unauthorized - Invalid or missing authentication
- `408`: Request Timeout - Request took too long
- `429`: Rate Limit Exceeded - Too many requests
- `500`: Internal Server Error - Unexpected server error
- `502`: Bad Gateway - External service error
- `503`: Service Unavailable - Service temporarily unavailable

## Security

### Authentication

Most endpoints require Firebase authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <firebase-jwt-token>
```

### Rate Limiting

API endpoints are rate-limited to prevent abuse:
- Claude Breakdown API: 5 requests per minute per user
- Rate limit headers are returned in responses
- `Retry-After` header indicates when to retry

### Input Validation

All inputs are validated against strict schemas:
- String length limits to prevent abuse
- Numeric range validation
- XSS protection through sanitization
- Business rule validation (e.g., Pomodoro estimates 1-20)

## Usage Examples

### Testing with cURL

```bash
# Health check
curl -X GET "http://localhost:3000/api/monitoring?type=health"

# Task breakdown (requires auth token)
curl -X POST "http://localhost:3000/api/claude-breakdown" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "description": "Build a React component library",
    "pomodoroDuration": 25
  }'
```

### Testing with JavaScript

```javascript
// Health check
const healthResponse = await fetch('/api/monitoring?type=health');
const health = await healthResponse.json();
console.log('Health status:', health.status);

// Task breakdown (in authenticated context)
const breakdownResponse = await fetch('/api/claude-breakdown', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${firebaseToken}`
  },
  body: JSON.stringify({
    description: 'Build a React component library',
    pomodoroDuration: 25
  })
});
const breakdown = await breakdownResponse.json();
console.log('Task breakdown:', breakdown.tasks);
```

## Development

### Updating the API Specification

1. Edit `/src/app/api/openapi.json` to update the OpenAPI specification
2. The documentation will automatically reflect changes
3. Test using the Swagger UI at `/api-docs`

### Adding New Endpoints

1. Add the new endpoint to the OpenAPI specification
2. Include complete schema definitions
3. Add request/response examples
4. Document error cases
5. Update this documentation

### Local Development

```bash
# Start development server
yarn dev

# View API documentation
open http://localhost:3000/api-docs

# Build and test
yarn build
yarn start
```

## API Specification

The complete OpenAPI 3.0 specification is available at:
- JSON format: `/api/spec`
- Interactive UI: `/api-docs`

## Support

For API questions or issues:
- Check the interactive documentation at `/api-docs`
- Review error messages and status codes
- Contact support through the application

## Changelog

### Version 1.0.0
- Initial API documentation implementation
- OpenAPI 3.0 specification for all endpoints
- Swagger UI integration
- Complete schema validation documentation
- Error handling documentation
- Authentication and rate limiting documentation