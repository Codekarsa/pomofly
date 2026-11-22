# PomoFly

PomoFly is a productivity application that combines the Pomodoro Technique with task management to help users boost their productivity and manage their time effectively.

## Features

- Pomodoro timer
- Task management
- User authentication
- Real-time data synchronization
- Responsive design for desktop and mobile

## Technologies Used

- Next.js
- React
- Firebase (Authentication, Firestore, Hosting)
- CSS (or specify if you're using a CSS framework)

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/pomofly.git
   cd pomofly
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your Firebase configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. Run the development server:
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Deployment

Pomofly deploys as a static Next.js export on Firebase Hosting. It does not need
Cloud Functions or the Blaze plan for Hosting. Firebase Auth and Firestore are
accessed directly from the browser, subject to their own quotas and security rules.

Set the `NEXT_PUBLIC_FIREBASE_*` build variables for the destination Firebase project
(see `.env.example`), then:

1. Build the project:
   ```
   npm run build
   ```

2. Deploy the generated `out` folder to Hosting only:
   ```
   npx firebase-tools@13 deploy --only hosting
   ```

`npm run deploy` combines these steps. Neither command deploys Firestore rules or
indexes. The CI workflow has a separate Firestore deployment step.

Firebase serves `/tasks/<id>` using the exported `/tasks/_` page; the browser reads
the real task ID and loads the user's data. The rewrite in `firebase.json` is
required for direct links and refreshes. Security headers are also served by
Firebase, rather than a Next.js server.

Only JSX/TSX pages are included in this static app (`pageExtensions` in
`next.config.mjs`). The `src/app/api/**/route.ts` server handlers are retained as
source but are **not deployed or available**, including Claude AI breakdown and
server-side CSP/monitoring ingestion. AI breakdown is not connected to the current
UI; client-side monitoring remains available. Do not expose an Anthropic secret in
browser configuration. Enabling these server APIs later requires a separately
deployed backend, not a static Hosting rewrite.

To preview the built site with the same headers and rewrites, run `npm start`.
This starts only the Firebase Hosting emulator; it does not emulate Auth or
Firestore. Use guest mode for local-only test data. `next start` cannot serve a
static export.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://reactjs.org/docs)
