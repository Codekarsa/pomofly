# Data Retention Policy

## Overview
This document outlines Pomofly's data retention policies to ensure compliance with GDPR, data minimization principles, and cost optimization.

## Data Categories and Retention Periods

### 1. Active User Data (2+ years)
- **User profiles and preferences**
- **Active projects and tasks**
- **Current subscription status**
- **Retention**: 2 years after account closure or last activity
- **Justification**: Long-term user experience continuity

### 2. Estimation History (1 year)
- **Task estimation records**
- **Accuracy tracking data**
- **Performance analytics**
- **Retention**: 1 year from creation date
- **Justification**: Sufficient for learning patterns and improving estimates

### 3. Analytics Data (6 months)
- **Usage statistics**
- **Feature adoption metrics**
- **Performance monitoring data**
- **Retention**: 6 months from collection
- **Justification**: Adequate for product improvement cycles

### 4. Guest Session Data (7 days)
- **Anonymous timer sessions**
- **Temporary task storage**
- **Local preferences**
- **Retention**: 7 days from creation
- **Justification**: Short-term utility for unregistered users

### 5. System Logs (30 days)
- **Application logs**
- **Security logs**
- **Performance metrics**
- **Retention**: 30 days from creation
- **Justification**: Operational debugging and security monitoring

### 6. Error Reports (90 days)
- **Crash reports**
- **Error tracking data**
- **Debug information**
- **Retention**: 90 days from occurrence
- **Justification**: Sufficient for identifying and fixing issues

## Automated Cleanup Schedule

### Daily Cleanup (3:00 AM UTC)
- Guest session data older than 7 days
- System logs older than 30 days

### Weekly Cleanup (Sundays, 2:00 AM UTC)
- Error reports older than 90 days
- Analytics data older than 6 months

### Monthly Cleanup (1st of month, 1:00 AM UTC)
- Estimation history older than 1 year
- Inactive user data older than 2 years

## User Data Rights

### Right to Data Portability
- Users can export their data via Settings > Privacy > Export Data
- Export includes all user data in JSON format
- Export is available for 24 hours after generation

### Right to Be Forgotten
- Users can delete their account via Settings > Privacy > Delete Account
- All user data is permanently deleted within 30 days
- Anonymized analytics data may be retained for legal compliance

### Right to Access
- Users can view all their stored data via Settings > Privacy > My Data
- Real-time view of data categories and retention status

## Implementation

### Automated Functions
- `cleanupGuestSessions()` - Daily cleanup of expired guest data
- `cleanupSystemLogs()` - Daily cleanup of old logs
- `cleanupAnalyticsData()` - Weekly cleanup of analytics data
- `cleanupEstimationHistory()` - Monthly cleanup of old estimates
- `cleanupInactiveUsers()` - Monthly cleanup of inactive accounts

### Monitoring and Compliance
- Cleanup job execution logs
- Data retention compliance dashboard
- Regular audits of retention policy adherence
- Automated alerts for failed cleanup operations

## Contact
For questions about data retention or to exercise your data rights, contact: privacy@pomofly.com