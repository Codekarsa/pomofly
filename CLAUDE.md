# Pomofly - Claude Code Guide

## Project Overview
Pomofly is an elegant Pomodoro timer app with task management, built with Next.js 14 and Firebase.

## Tech Stack
- **Framework:** Next.js 14.2.13 (App Router, static export)
- **UI:** React 18, TypeScript 5, Tailwind CSS 3.4
- **Components:** shadcn/ui + Radix UI
- **Backend:** Firebase (Auth, Firestore)
- **AI:** Anthropic Claude SDK (task breakdown)
- **Testing:** Jest + React Testing Library

## Quick Commands
```bash
yarn dev          # Start dev server (localhost:3000)
yarn build        # Production build (static export to /out)
yarn test         # Run tests
yarn lint         # ESLint
yarn beads        # Show Beads issues
yarn beads:push   # Sync issues to GitHub
```

## Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home (Timer page)
│   ├── tasks/page.tsx     # Tasks management
│   ├── projects/page.tsx  # Projects management
│   ├── api/               # API routes
│   └── contexts/          # React contexts
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── PomodoroTimer.tsx # Main timer
│   ├── TaskList.tsx      # Task management
│   └── AppLayout.tsx     # App shell
├── hooks/                 # Custom hooks
│   ├── usePomodoro.ts    # Timer logic
│   ├── useTasks.ts       # Task CRUD
│   └── useProjects.ts    # Project CRUD
└── lib/
    ├── firebase.ts       # Firebase config
    └── utils.ts          # Utilities
```

## Key Patterns

### 1. Firebase Lazy Init (for SSG)
```typescript
// Skip init during build, init at runtime
const isServer = typeof window === 'undefined';
if (hasConfig) { /* init */ } else if (!isServer) { throw }
```

### 2. Timestamp-Based Timer
```typescript
// Prevents drift - uses Date.now() not intervals
const getRemainingTime = () => {
  const elapsed = Date.now() - timerStartedAt;
  return totalDuration - elapsed;
};
```

### 3. Custom Hooks for Data
```typescript
const { tasks, loading, error, addTask } = useTasks();
const { projects } = useProjects();
```

### 4. Firestore Queries (always filter by userId)
```typescript
const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
```

## Code Conventions
- Use `useCallback` for callbacks passed to children
- Use `React.memo` for expensive components
- Use `useMemo` for filtered/sorted lists
- Always filter Firestore by `userId`
- Track analytics events for user actions
- Client components: add `'use client'` directive

## Environment Variables
```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
CLAUDE_API_KEY=
```

## Issue Tracking (Beads)
```bash
bd list                    # View issues
bd create "title"          # Create issue
bd update <id> --status in_progress
bd close <id>              # Complete
bd sync                    # Sync with git
```

## Testing
```bash
yarn test                  # Run all tests
yarn test:watch           # Watch mode
yarn test:coverage        # Coverage report
```

Test files: `src/**/__tests__/*.test.ts(x)`
