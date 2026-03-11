# Security Notes

## Firebase Credentials Security

**IMPORTANT**: The production Firebase credentials that were previously hard-coded in `src/lib/firebase.ts` have been removed as of this commit. 

**Action Required:**
1. The exposed credentials should be rotated immediately in the Firebase console
2. New credentials should be set via environment variables only
3. Never commit production credentials to version control

## Environment Variables

All Firebase configuration must be provided via environment variables:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` 
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

The application will fail to initialize if any of these are missing, preventing security misconfigurations.

## Development vs Production

- Use separate Firebase projects for development and production
- Never use production credentials in development environments
- Test with development credentials that have limited permissions