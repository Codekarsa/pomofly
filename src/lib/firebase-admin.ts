import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

/**
 * Lazy Firebase Admin singleton, server-side only.
 *
 * verifyIdToken only needs the project ID (tokens are verified against
 * Google's public certs), so no service-account credentials are required —
 * this works in `yarn dev` and on Cloud Functions alike.
 */
export function getAdminAuth(): Auth {
  const app =
    getApps()[0] ??
    initializeApp({
      projectId:
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
        process.env.GCLOUD_PROJECT, // set automatically on Cloud Functions
    });
  return getAuth(app);
}
