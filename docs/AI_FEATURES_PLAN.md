# PomoFly AI Features Plan

## 1. AI Task Breakdown — Review & Improvements

### Current Flow
1. User clicks "AI Breakdown" button in TaskList
2. Modal opens with form: description, optional dates, pomodoro settings, project selector
3. User submits → Claude generates subtasks with estimates
4. User can edit/delete subtasks in the modal
5. User selects project and saves → tasks created

### Current Pain Points

| Issue | Impact | Fix |
|-------|--------|-----|
| **Modal is heavy** — many fields upfront | Friction, cognitive load | Progressive disclosure |
| **No context** — doesn't see existing tasks/projects | Misses opportunity for smart suggestions | Pass context to AI |
| **One-shot** — can't iterate with AI | User stuck with first result | Add "Refine" button |
| **No streaming** — user waits with spinner | Feels slow | Stream response |
| **Disconnected** — can't breakdown FROM a task | Must start fresh | Add "Breakdown this task" action |

### Proposed Improvements

#### A. Simplify Entry Point
```
Current:  [+ Add Task] [AI Breakdown]  ← separate buttons
Proposed: [+ Add Task ▼]
            └─ Manual
            └─ AI Breakdown
            └─ Quick Add (natural language)
```

#### B. Progressive Disclosure Modal
**Step 1: Just describe it**
```
┌─────────────────────────────────────────────┐
│  What do you need to accomplish?            │
│  ┌─────────────────────────────────────────┐│
│  │ Build the user authentication flow     ││
│  │ with Google and email login            ││
│  └─────────────────────────────────────────┘│
│                                             │
│  [Continue →]                               │
│                                             │
│  ○ Advanced options (dates, settings)       │
└─────────────────────────────────────────────┘
```

**Step 2: Review & Refine**
```
┌─────────────────────────────────────────────┐
│  Here's my suggestion:                      │
│                                             │
│  □ Set up Firebase Auth config      2 🍅   │
│  □ Create login page UI             3 🍅   │
│  □ Implement Google OAuth           2 🍅   │
│  □ Implement email/password auth    3 🍅   │
│  □ Add auth state management        2 🍅   │
│  □ Test authentication flows        2 🍅   │
│                                     ──────  │
│                            Total:  14 🍅   │
│                                             │
│  Project: [Select project ▼]                │
│                                             │
│  [← Back] [Refine with AI] [Save Tasks]     │
└─────────────────────────────────────────────┘
```

#### C. "Breakdown This Task" Context Menu
Add to existing task dropdown:
```
┌──────────────────┐
│ 👁 View Detail   │
│ ✏️ Edit          │
│ 📅 Set Deadline  │
│ 🤖 AI Breakdown  │  ← NEW: breaks down selected task
│ 🗑 Delete        │
└──────────────────┘
```

This passes the task title + description as context to AI.

#### D. Stream Response
Show tasks appearing one by one as Claude generates:
```
□ Set up Firebase Auth config      2 🍅  ✓
□ Create login page UI             3 🍅  ✓
□ Implementing...                        ⏳
```

#### E. Smart Context
Pass to Claude:
- Existing project names (suggest matching project)
- Similar completed tasks (for better estimates)
- User's average pomodoro completion rate

---

## 2. Intelligent Time Estimation — New Feature

### Problem Statement
Users consistently underestimate task duration. Studies show humans are 40-50% off on time estimates. PomoFly has the data to help.

### Data We Can Collect
```typescript
interface TaskHistory {
  taskId: string;
  title: string;
  projectId: string;
  estimatedPomodoros: number;
  actualPomodoros: number;     // from totalPomodoroSessions
  totalTimeSpent: number;      // from time tracking
  completed: boolean;
  createdAt: Date;
  completedAt: Date;
}
```

### Feature Design

#### A. Learning Phase (Passive)
For the first 2-4 weeks, just collect data silently:
- Track estimated vs actual for every completed task
- Build per-user accuracy profile
- Identify patterns (task type, project, time of day)

#### B. Suggestion Phase (Active)

**When user creates/edits a task:**
```
┌─────────────────────────────────────────────┐
│  Task: Implement payment integration        │
│                                             │
│  Estimated Pomodoros:                       │
│  ┌─────┐                                    │
│  │  3  │  💡 Similar tasks took 5-6 🍅     │
│  └─────┘     (Based on 4 past tasks)        │
│                                             │
└─────────────────────────────────────────────┘
```

**Confidence indicators:**
```
💡 High confidence (10+ similar tasks)
🤔 Medium confidence (3-9 similar tasks)  
📊 Low confidence (learning from your patterns)
```

**UI Options:**

Option 1: Inline hint (subtle)
```
Estimated: [3] 🍅  
           └─ 💡 Suggestion: 5 🍅 based on history
```

Option 2: Smart default (proactive)
```
Estimated: [5] 🍅  ← AI suggested
           └─ Your estimate was 3, but similar tasks took 5
           └─ [Use my estimate: 3]
```

Option 3: Range display
```
Estimated: [3] 🍅
           └─ 📊 Likely range: 4-6 🍅 (80% confidence)
```

#### C. How Matching Works

**Task Similarity Algorithm:**
1. **Title keywords** — "implement", "fix", "design", "test"
2. **Project context** — same project = similar complexity
3. **Task length** — short titles = simple tasks (usually)
4. **Time patterns** — user's accuracy varies by project

```typescript
interface EstimationModel {
  // User's overall accuracy ratio
  globalAccuracyRatio: number;  // e.g., 0.6 means they estimate 60% of actual
  
  // Per-project accuracy
  projectAccuracy: Map<string, number>;
  
  // Keyword-based adjustments
  keywordMultipliers: Map<string, number>;
  // e.g., "refactor" → 1.5x, "fix" → 0.8x
  
  // Sample size for confidence
  sampleCount: number;
}
```

#### D. Estimation API

**New endpoint: `/api/estimate`**
```typescript
// Request
{
  title: string;
  projectId?: string;
  userEstimate?: number;
}

// Response  
{
  suggestedPomodoros: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  basedOn: {
    similarTasks: number;
    avgAccuracyRatio: number;
  };
}
```

#### E. UI/UX Flow

**Task Creation:**
```
1. User types task title
2. (Debounced) Call estimation API
3. Show suggestion inline if confident
4. User can accept/ignore
```

**Task Completion:**
```
1. User marks task complete
2. If estimate was way off (>50% difference):
   
   ┌─────────────────────────────────────────┐
   │  📊 Quick insight                       │
   │                                         │
   │  "Implement auth" took 7 🍅             │
   │  You estimated 3 🍅                     │
   │                                         │
   │  This helps me give better suggestions! │
   │                                         │
   │  [Got it]                               │
   └─────────────────────────────────────────┘
```

**Weekly Digest (optional notification):**
```
📊 Your estimation accuracy this week: 68%
   ↑ 12% improvement from last week!
   
   Tip: Your "frontend" tasks take 1.5x longer 
   than estimated on average.
```

---

## Implementation Phases

### Phase 1: Foundation (1 week)
- [ ] Add `actualPomodoros` tracking to task completion
- [ ] Create estimation history collection
- [ ] Build basic similarity matching

### Phase 2: Passive Learning (2 weeks)
- [ ] Collect data for 2+ weeks
- [ ] Build accuracy model per user
- [ ] No UI changes yet — just learning

### Phase 3: Suggestions UI (1 week)
- [ ] Inline estimation hints
- [ ] "Similar tasks" tooltip
- [ ] Confidence indicators

### Phase 4: AI Breakdown Improvements (1 week)
- [ ] Progressive disclosure modal
- [ ] Streaming responses
- [ ] "Breakdown this task" action
- [ ] Pass historical context to Claude

### Phase 5: Insights & Coaching (future)
- [ ] Weekly estimation accuracy report
- [ ] Per-project insights
- [ ] Improvement tips

---

## Database Schema Changes

```typescript
// Add to Task type
interface Task {
  // ... existing fields
  
  // New fields for estimation learning
  estimationSource?: 'manual' | 'ai-suggested' | 'ai-accepted';
  aiSuggestedEstimate?: number;
  completedPomodoros?: number;  // snapshot at completion
  estimationAccuracy?: number;  // calculated: estimated / actual
}

// New collection: estimation_history
interface EstimationRecord {
  id: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  projectId?: string;
  estimatedPomodoros: number;
  actualPomodoros: number;
  accuracy: number;  // estimated / actual
  completedAt: Date;
  keywords: string[];  // extracted from title
}
```

---

## Decisions (Confirmed by Gusti 2026-03-04)

1. **Estimation UI: Subtle hint with click-to-accept**
   ```
   Estimated: [3] 🍅  💡 5 🍅 suggested [Apply]
   ```
   - User stays in control
   - One click to accept suggestion
   - Non-intrusive

2. **AI Breakdown uses estimation history: YES**
   - Pass accuracy data to Claude
   - "User typically underestimates by X% on this project"
   - Claude adjusts its estimates accordingly

---

*Created: 2026-03-04*
*Author: Andi (AI Assistant)*
