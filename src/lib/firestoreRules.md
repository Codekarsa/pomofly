# Firestore Security Rules Documentation

## Overview

This document describes the comprehensive security rules implemented for the Pomofly application's Firestore database. These rules ensure data privacy, integrity, and proper access control for all collections.

## Security Principles

1. **Authentication Required**: All database operations require authenticated users
2. **User Isolation**: Users can only access their own data (userId-based filtering)
3. **Data Validation**: All incoming data is validated for structure and constraints
4. **Principle of Least Privilege**: Only necessary permissions are granted
5. **Input Sanitization**: String lengths and formats are validated

## Collections and Rules

### Tasks Collection (`/tasks/{taskId}`)

**Access Control:**
- Users can only read/write tasks where `userId` matches their authentication ID
- All operations require authentication

**Validation Rules:**
- **title**: Required string, 1-1000 characters
- **userId**: Required string, 1-128 characters
- **completed**: Required boolean
- **projectId**: Optional string, 1-128 characters (nullable)
- **estimatedPomodoros**: Optional integer, 1-50 (nullable)
- **focus**: Optional boolean
- **deadline**: Optional string (nullable)
- **estimationSource**: Optional enum: 'manual' or 'ai'
- **archived**: Optional boolean
- **totalPomodoroSessions**: Optional non-negative integer
- **totalTimeSpent**: Optional non-negative integer
- **manualTimeSpent**: Optional non-negative integer
- **completedPomodoros**: Optional non-negative integer

### Projects Collection (`/projects/{projectId}`)

**Access Control:**
- Users can only read/write projects where `userId` matches their authentication ID

**Validation Rules:**
- **name**: Required string, 1-200 characters
- **userId**: Required string, 1-128 characters

### Labels Collection (`/labels/{labelId}`)

**Access Control:**
- Users can only read/write labels where `userId` matches their authentication ID

**Validation Rules:**
- **name**: Required string, 1-100 characters
- **userId**: Required string, 1-128 characters
- **color**: Required hex color format (#rrggbb)

### Estimation History Collection (`/estimation_history/{estimationId}`)

**Access Control:**
- Users can only read/write estimation records where `userId` matches their authentication ID

**Validation Rules:**
- **userId**: Required string, 1-128 characters
- **taskId**: Required string, 1-128 characters
- **taskTitle**: Required string, 1-1000 characters
- **estimatedPomodoros**: Required positive integer, 1-50
- **actualPomodoros**: Required non-negative integer
- **accuracy**: Required positive number
- **completedAt**: Required timestamp
- **projectId**: Optional string, 1-128 characters (nullable)
- **keywords**: Optional array, max 20 items

## Helper Functions

### `isAuthenticated()`
Checks if the request has a valid authentication token.

### `isOwner(userId)`
Validates that the authenticated user matches the provided userId.

### `isValidEmail()`
Ensures the user has a verified email address (currently unused but available for future features).

### `validateStringField(field, minLen, maxLen)`
Validates string fields for type, minimum length, and maximum length.

### Collection-Specific Validators
- `validateTaskData(data)`: Comprehensive task data validation
- `validateProjectData(data)`: Project data validation
- `validateLabelData(data)`: Label data validation with color format checking
- `validateEstimationData(data)`: Estimation record validation

## Deployment

### Prerequisites
- Firebase CLI installed and configured
- Project configured with proper Firebase project ID

### Deploy Rules
```bash
firebase deploy --only firestore:rules
```

### Testing Rules
```bash
firebase emulators:start --only firestore
npm run test:rules
```

## Security Benefits

1. **Data Isolation**: Complete user data separation prevents unauthorized access
2. **Input Validation**: Prevents malformed data and potential injection attacks
3. **Resource Protection**: Limits on string lengths prevent resource exhaustion
4. **Type Safety**: Strict type validation ensures data consistency
5. **Default Deny**: Explicit denial of all other document access

## Monitoring and Auditing

The rules include comprehensive logging through Firebase's built-in security rules monitoring. Monitor:

- Failed authentication attempts
- Unauthorized access attempts
- Data validation failures
- Unusual query patterns

## Future Enhancements

Potential improvements for additional security:

1. **Rate Limiting**: Implement request rate limiting
2. **IP Restrictions**: Geographic or IP-based access controls
3. **Advanced Validation**: More sophisticated data validation rules
4. **Audit Logging**: Enhanced logging for compliance requirements
5. **Shared Resources**: Rules for team collaboration features

## Testing

Run the security rules test suite to validate all access patterns:

```bash
npm run test:security-rules
```

This ensures that:
- Authenticated users can access only their data
- Unauthenticated requests are properly denied
- Data validation works correctly
- Cross-user access attempts fail appropriately