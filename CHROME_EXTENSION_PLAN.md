# Pomofly Chrome Extension - Implementation Plan

## Vision

A Chrome extension that turns the browser into a task capture surface for Pomofly. Any webpage becomes a source of tasks — select text, capture URLs, pull structured data from GitHub/Jira/Linear, and manage your Pomodoro workflow without leaving the current tab.

---

## Feature Set

### Core Features (MVP)

#### 1. Quick-Add Task from Toolbar Popup
- Click the Pomofly icon in the toolbar to open a compact popup
- Fields: task title, project selector, estimated pomodoros, optional deadline
- Projects fetched from user's Pomofly account
- Task is created instantly in Firestore, syncs to the web app in real-time

#### 2. Right-Click Context Menu: "Add to Pomofly"
- Select any text on a webpage, right-click, and choose "Add to Pomofly"
- Selected text becomes the task title (editable before saving)
- Current page URL is automatically attached as a reference link
- If no text is selected, the page title is used instead

#### 3. Add Current Page as Task
- One-click button in the popup to capture the current tab
- Auto-extracts: page title (as task name), URL (as reference), and meta description (as context)
- User can edit before saving

#### 4. Smart Platform Detection (GitHub, Jira, Linear)

**GitHub Issues & PRs:**
- Detects when on a GitHub issue or PR page
- Auto-extracts: issue/PR title, number, repo name, labels, assignees, status (open/closed/merged)
- Suggested task title: `[repo-name] #123: Issue title`
- Stores the issue/PR URL as a reference link
- Optionally captures the issue body as task notes/description

**Jira Tickets:**
- Detects Jira cloud URLs (`*.atlassian.net/browse/*`)
- Auto-extracts: ticket key (e.g., PROJ-123), summary, status, priority, assignee
- Suggested task title: `[PROJ-123] Ticket summary`
- Stores Jira URL as reference

**Linear Tickets:**
- Detects Linear URLs (`linear.app/*/issue/*`)
- Auto-extracts: issue identifier, title, status, priority, team
- Suggested task title: `[TEAM-123] Issue title`
- Stores Linear URL as reference

#### 5. Authentication
- Google OAuth login matching the existing Pomofly auth flow
- Shared Firebase project — same user account, same data
- Persistent login state in the extension
- Guest mode support (syncs to localStorage via message passing to web app — or disabled for extension)

---

### Enhanced Features (Post-MVP)

#### 6. Mini Pomodoro Timer in Popup
- Start/pause/reset a pomodoro timer directly from the extension popup
- Select which task to work on from your task list
- Timer state syncs with the web app (both read from/write to the same Firestore document)
- Shows remaining time on the extension badge icon (e.g., "18:42")

#### 7. Browser Notifications for Timer Events
- Notification when a pomodoro session ends
- Notification when a break ends
- Configurable sound alerts
- Click notification to open Pomofly or start next session

#### 8. Keyboard Shortcuts
- `Alt+Shift+A` — Open quick-add task popup
- `Alt+Shift+T` — Start/pause timer
- `Alt+Shift+P` — Open Pomofly dashboard in a new tab
- Customizable via Chrome's extension shortcuts settings

#### 9. Side Panel Mode
- Use Chrome's Side Panel API to open Pomofly as a persistent sidebar
- Full task list + timer visible alongside any webpage
- Drag-and-drop text from pages into the side panel to create tasks

#### 10. Batch Capture from List Pages
- On GitHub issues list, Jira board, or Linear board pages: detect multiple items
- Show a "Capture N items to Pomofly" option
- Let user select which items to import as tasks
- Bulk-create tasks with proper titles and reference links

#### 11. Focus Mode / Website Blocking
- During an active pomodoro, optionally block distracting websites
- User configures a blocklist (or uses a default list: social media, news, etc.)
- Shows a "You're in a Pomofly focus session" interstitial on blocked sites
- Redirects back to the task or shows remaining time

#### 12. Tab Time Tracking
- Passively track which tabs/domains the user spends time on during a pomodoro
- Associate tab activity with the current active task
- Show a breakdown: "During this pomodoro: 15m on GitHub, 5m on StackOverflow, 5m on docs"
- Helps with productivity awareness (opt-in, privacy-respecting)

#### 13. Daily Summary Badge & Stats
- Extension badge shows: number of completed pomodoros today, or active timer
- Popup footer shows: tasks completed today, total focus time, current streak

#### 14. AI Task Breakdown via Extension
- Leverage the existing `/api/claude-breakdown` endpoint
- Select a large block of text (e.g., a project brief, a long GitHub issue) and right-click "Break down with Pomofly AI"
- Opens a modal in the popup showing AI-generated subtasks
- User reviews, edits, and bulk-adds them to a project

#### 15. Omnibox Integration
- Type `pomo` in Chrome's address bar, press Tab, then type a task title
- Quick task creation without opening the popup at all
- Example: `pomo Fix the login redirect bug` + Enter = task created

---

## Architecture

### Extension Structure

```
pomofly-extension/
├── manifest.json              # Manifest V3 configuration
├── popup/
│   ├── popup.html             # Toolbar popup UI
│   ├── popup.tsx              # Popup React app
│   └── components/
│       ├── QuickAddForm.tsx   # Task creation form
│       ├── TaskList.tsx       # Compact task list
│       ├── MiniTimer.tsx      # Timer widget
│       ├── PlatformCapture.tsx# Smart capture UI
│       └── ProjectSelector.tsx
├── sidepanel/
│   ├── sidepanel.html         # Side panel UI
│   └── sidepanel.tsx          # Side panel React app
├── background/
│   └── service-worker.ts      # Background service worker
├── content/
│   ├── detector.ts            # Platform detection (GitHub/Jira/Linear)
│   └── extractor.ts           # Page data extraction
├── shared/
│   ├── firebase.ts            # Firebase client (shared config)
│   ├── auth.ts                # Auth handling for extension context
│   ├── types.ts               # Shared types (reuse Task, Project interfaces)
│   ├── storage.ts             # Chrome storage utilities
│   └── constants.ts           # Platform URL patterns, config
├── assets/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── options/
    ├── options.html           # Extension settings page
    └── options.tsx            # Settings UI (blocklist, shortcuts, preferences)
```

### Component Responsibilities

**Service Worker (background)**
- Manages context menu registration ("Add to Pomofly")
- Handles context menu click events
- Manages timer state and badge updates
- Sends browser notifications
- Coordinates between popup, content script, and side panel
- Handles omnibox input

**Content Script**
- Injected into web pages to detect platform (GitHub, Jira, Linear)
- Extracts structured data from the current page DOM
- Sends extracted data to the popup/service worker via message passing
- Handles text selection for right-click capture

**Popup**
- Compact UI for quick task creation
- Shows current timer status
- Lists today's focus tasks
- Platform-aware: shows extracted data when on a supported site

**Side Panel**
- Fuller UI experience with complete task list
- Persistent alongside browsing
- Timer with full controls

**Options Page**
- Configure website blocklist for focus mode
- Toggle features on/off
- Manage notification preferences
- Set default project for quick capture

### Data Flow

```
[Web Page] ---(content script extracts data)---> [Message Passing]
     |                                                  |
     v                                                  v
[Context Menu Click] -----> [Service Worker] -----> [Popup UI]
                                  |                     |
                                  v                     v
                            [Chrome Storage]     [Firebase/Firestore]
                            (local state,         (tasks, projects,
                             preferences)          timer state)
                                                       |
                                                       v
                                                [Pomofly Web App]
                                                (real-time sync)
```

### Shared Code with Web App

Reuse from the existing Pomofly codebase:
- `Task` and `Project` TypeScript interfaces (from `useTasks.ts`, `useProjects.ts`)
- Firebase configuration (from `lib/firebase.ts`)
- Firestore query patterns (userId-scoped reads/writes)
- The same Firestore collections — no separate backend needed

### Authentication Strategy

- Use `chrome.identity` API with the same Google OAuth client ID
- Or use Firebase Auth's `signInWithCredential()` with a Chrome identity token
- Token stored in `chrome.storage.local` for persistence
- Same `userId` maps to the same Firestore data — instant sync

---

## Platform Detection Patterns

| Platform | URL Pattern | Data to Extract |
|----------|------------|-----------------|
| GitHub Issue | `github.com/:owner/:repo/issues/:number` | Title, number, repo, labels, body, state |
| GitHub PR | `github.com/:owner/:repo/pull/:number` | Title, number, repo, labels, body, state, merge status |
| Jira | `*.atlassian.net/browse/:key` | Key, summary, status, priority, assignee, description |
| Linear | `linear.app/:workspace/issue/:id` | Identifier, title, status, priority, team, description |
| Notion | `notion.so/*` | Page title, URL |
| Trello | `trello.com/c/*` | Card title, list name, board name |
| Asana | `app.asana.com/0/:project/:task` | Task name, project, assignee |
| GitLab Issue | `gitlab.com/:group/:project/-/issues/:number` | Title, number, project, labels |
| Slack (message link) | `*.slack.com/archives/*` | Channel name, message snippet |
| Generic page | Any URL | Page title, URL, selected text, meta description |

---

## Task Model Extension

The current `Task` interface needs a few new optional fields to support extension-captured data:

| New Field | Type | Purpose |
|-----------|------|---------|
| `sourceUrl` | `string \| null` | URL of the page where the task was captured |
| `sourcePlatform` | `string \| null` | Platform identifier: `"github"`, `"jira"`, `"linear"`, `"web"`, etc. |
| `sourceMetadata` | `object \| null` | Platform-specific structured data (issue number, labels, PR status, etc.) |
| `description` | `string \| null` | Longer description or notes captured from the page |
| `capturedVia` | `string \| null` | How the task was created: `"extension-context-menu"`, `"extension-popup"`, `"extension-sidepanel"`, `"extension-omnibox"`, `"web-app"` |

These fields are additive and optional — they don't break the existing web app. The web app can progressively enhance its UI to display source links and platform badges when these fields are present.

---

## Implementation Phases

### Phase 1: Foundation (MVP)
1. Scaffold the Chrome extension project (Manifest V3, React, TypeScript, Tailwind)
2. Set up Firebase in the extension context (shared config, auth via `chrome.identity`)
3. Build the popup UI with quick-add task form
4. Implement project selector (fetch from Firestore)
5. Add context menu: "Add to Pomofly" on right-click
6. Capture selected text + page URL on context menu click
7. Extend the Task model with `sourceUrl`, `description`, `capturedVia`
8. Verify real-time sync: task created in extension appears in web app instantly

### Phase 2: Smart Platform Capture
1. Build content script with platform URL detection
2. Implement GitHub issue/PR data extractor
3. Implement Jira ticket data extractor
4. Implement Linear ticket data extractor
5. Add `sourcePlatform` and `sourceMetadata` fields
6. Build the "smart capture" UI in popup — show extracted data, let user edit before saving
7. Update web app TaskList/TaskDetail to display source links and platform badges

### Phase 3: Timer & Notifications
1. Build mini timer in popup (syncs with Firestore timer state)
2. Implement badge countdown on extension icon
3. Add browser notifications for session/break transitions
4. Add keyboard shortcuts for common actions

### Phase 4: Power Features
1. Side panel integration (Chrome Side Panel API)
2. Batch capture from list pages (GitHub issues list, Jira board)
3. AI task breakdown via extension (reuse existing API)
4. Omnibox integration (`pomo` keyword)
5. Focus mode with website blocking
6. Tab time tracking (opt-in)
7. Daily stats in popup

---

## Technical Considerations

### Manifest V3 Constraints
- Service workers replace persistent background pages — timer logic must handle service worker lifecycle (idle termination)
- Use `chrome.alarms` API for reliable timer ticks instead of `setInterval`
- Use `chrome.storage` for persisting state across service worker restarts
- Content scripts have limited API access — communicate via `chrome.runtime.sendMessage`

### Firebase in Extension Context
- Firebase JS SDK works in Chrome extensions but needs careful initialization
- Auth popup flow may need `chrome.identity.launchWebAuthFlow` instead of `signInWithPopup`
- Firestore listeners (`onSnapshot`) work in popup/side panel but not in service workers (they terminate)
- Service worker should use one-shot reads (`getDoc`/`getDocs`) and write operations

### Security
- Extension permissions should be minimal: `activeTab`, `contextMenus`, `storage`, `identity`, `alarms`, `notifications`, `sidePanel`
- Optional host permissions for platform detection (requested on first use)
- Firebase security rules already enforce userId-scoped access — no changes needed
- No sensitive data stored in content scripts

### Performance
- Content scripts should be lightweight — detect platform and extract data only when needed
- Popup should load fast — lazy-load non-critical components
- Cache project list in `chrome.storage` to avoid Firestore reads on every popup open
- Debounce Firestore writes for rapid interactions

### Backward Compatibility
- New Task fields are all optional — existing tasks and web app work unchanged
- Web app can be updated incrementally to render source links and platform data
- Extension and web app share the same Firestore collections — no data migration needed

---

## Build & Distribution

### Development
- Separate package/workspace within the Pomofly monorepo (e.g., `packages/chrome-extension/`)
- Or standalone repo that imports shared types from the main app
- Build with Vite or webpack for extension-compatible output
- Hot reload during development via Chrome extension dev tools

### Testing
- Unit tests for extractors and data transformations (Jest)
- Integration tests for Firebase operations
- Manual testing across GitHub, Jira, Linear pages
- Cross-browser testing (Chrome, Edge — both Chromium-based)

### Distribution
- Chrome Web Store (primary)
- Edge Add-ons (same codebase, Manifest V3 compatible)
- Firefox (would need Manifest V2 adaptation — consider as future)
- Link to extension from the Pomofly web app's settings/header

---

## Summary

| Phase | Features | Depends On |
|-------|----------|------------|
| **Phase 1** | Popup quick-add, context menu capture, page URL capture, auth, Firestore sync | Nothing |
| **Phase 2** | GitHub/Jira/Linear detection, smart extraction, source metadata, web app badges | Phase 1 |
| **Phase 3** | Mini timer, badge countdown, notifications, keyboard shortcuts | Phase 1 |
| **Phase 4** | Side panel, batch capture, AI breakdown, omnibox, focus mode, tab tracking | Phase 2 + 3 |

Phase 1 delivers immediate value: capture tasks from anywhere in the browser. Each subsequent phase layers on richer integrations without disrupting what already works.
