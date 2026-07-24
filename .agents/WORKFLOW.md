# Agent Workflow

## State machine

```
to be planned     → [Agent PM]  → plan approval | need confirmation
need confirmation → [Human]     → to be planned (re-plan after answer)
plan approval     → [Human]     → todo
todo              → [Agent Dev] → in progress → qa ready | need confirmation
qa ready          → [Agent QA]  → qa in progress
qa in progress    → [Agent QA]  → review ready → done | feedback | need confirmation
feedback          → [Agent Dev] → in progress → qa ready | need confirmation
```

## Label rules

- A task must have exactly ONE state label at any time.
- If a required label is not available in the repository (not created yet), create it manually before applying it — e.g. `gh label create "<label>" --repo <owner>/<repo> --description "<state description>"` — then proceed with the normal transition. Never skip a label transition, fail silently, or leave an issue in the wrong state because a label is missing.
- When adding a new state label, ALWAYS remove the previous state label in the same action.
- Never leave a task with zero state labels or two state labels.
- If work becomes blocked or needs human clarification/confirmation, do not leave the task `in progress` or `qa in progress`. Remove the active in-progress label and add `need confirmation` in the same action, then document the blocker clearly in the related channel and GitHub issue comment.


## In-progress issue priority rule

Before picking up any new `todo` or `feedback` issue, Agent Dev MUST first check for any open issue labeled `in progress`. If an `in progress` issue exists:

1. Verify the issue is not already done — check if the PR is merged, if acceptance criteria are met, or if the work is complete.
2. Verify no other agent is actively working on it using the claim protocol (see "Issue claiming and staleness"). A fresh claim from another agent means do not interfere; a stale claim or missing claim means the issue is resumable.
3. If the issue is not done and no other agent is working on it, resume work on that `in progress` issue instead of picking up a new `todo` or `feedback` issue.
4. Only when there are zero valid `in progress` issues (or the only `in progress` issue is done or being actively worked by another agent) may the agent select a new `todo` or `feedback` issue.

This prevents stale `in progress` issues from accumulating and ensures interrupted work is resumed before starting new work.

## QA in-progress priority rule

Before picking up any new `qa ready` issue, Agent QA MUST first check for any open issue labeled `qa in progress`. If a `qa in progress` issue exists:

1. Verify the issue is not already done — check whether the QA report was posted, labels were already transitioned, or the related PR/issue is no longer awaiting QA.
2. Verify no other QA agent/session is actively working on it using the claim protocol (see "Issue claiming and staleness"). A fresh claim from another QA session means do not interfere; a stale claim or missing claim means the issue is resumable.
3. If the issue is still awaiting QA and no other QA session is active, resume that `qa in progress` issue instead of picking up a new `qa ready` issue.
4. Only when there are zero valid `qa in progress` issues may Agent QA select a new `qa ready` issue.

When Agent QA starts a new `qa ready` issue, it MUST immediately remove `qa ready` and add `qa in progress` in the same label action before doing the detailed QA review. After QA is complete, it MUST remove `qa in progress` and add the final result label (`review ready`, `feedback`, or `need confirmation` if blocked by a dependency/confirmation need) in the same label action.

This prevents multiple QA runs from reviewing the same issue and makes interrupted QA work resumable.

## Issue claiming and staleness

Labels mark workflow state; claims mark ownership. Determining whether "another agent is actively working" on an issue must use this claim protocol, not guesses from recent comment activity.

When an agent starts active work on an issue (adding `in progress` or `qa in progress`), it must claim the issue in the same action:

1. Assign the issue to the agent's GitHub account when possible.
2. Post a structured claim comment: `CLAIMED by <agent-name> (<engine: claude-code | openclaw-fallback>) at <ISO-8601 UTC timestamp>`.

Staleness rule: a claim is **stale** when the claiming agent has produced no new commits, comments, or label changes on the issue/PR for **2 hours**.

- Fresh claim from another agent → do not interfere; report and stop.
- Stale claim, or an `in progress` / `qa in progress` issue with no claim comment at all → the issue is resumable. The resuming agent posts its own claim comment before continuing work.
- Any label transition out of `in progress` / `qa in progress` releases the claim — the new state label supersedes it.

## Feedback cycle limit (circuit breaker)

The dev↔QA loop must not ping-pong indefinitely on the same issue. A "feedback cycle" is one round trip: QA transitions the issue to `feedback` and Dev returns it to `qa ready`.

- Before transitioning an issue to `feedback`, Agent QA must count the issue's prior feedback cycles from the issue timeline/comments (prior QA `feedback` transitions or QA bug reports).
- If the issue has already completed **3 feedback cycles**, do not add `feedback` again. Remove the active state label and add `need confirmation` instead, with a comment summarizing what each cycle attempted, what keeps failing, and a recommendation for how the human should unblock it (re-scope, re-plan, split the issue, pair review, or accept as-is).
- Agent Dev applies the same check when picking up a `feedback` issue: if it is already on its 4th or later cycle, move it to `need confirmation` with the same summary instead of attempting another fix.

This caps the budget an issue can burn without human intervention and surfaces systematically failing work instead of letting it loop silently.

## CLI execution model

Agents run as **Claude Code CLI** non-interactive sessions invoked by OpenClaw cron jobs.
The `.agents/` files are the single source of truth for agent instructions — the cron
payload is a thin wrapper that tells Claude Code to read these files and execute.

### Invocation pattern

```
claude -p \
  --model <model> \
  --permission-mode auto \
  --output-format json \
  --add-dir <repo-path> \
  "<prompt>"
```

The prompt instructs Claude Code to:
1. Read `.agents/WORKFLOW.md` and the agent-specific `.agents/agent-<role>.md`
2. Read `AGENTS.md` for project conventions
3. Execute the recurring task defined in the agent file

### Model assignments

| Agent     | Model  | Rationale                                    |
| --------- | ------ | -------------------------------------------- |
| Agent PM  | opus   | Deep reasoning for specs, edge cases, deps  |
| Agent Dev | sonnet | Fast, capable implementation and git work   |
| Agent QA  | opus   | Deep code review, testing, and bug reporting |

### Cron wrapper architecture

OpenClaw cron jobs fire isolated sessions with `lightContext: true` and a minimal
prompt. The isolated session runs a pre-check gate first, then uses Claude Code
when there is actual work. Claude Code is always the first-priority execution
engine. If Claude Code is unavailable — for example the `claude` command is
missing, returns an execution error, authentication error, rate-limit/quota error,
or otherwise cannot start/complete the task — the cron session MUST continue the
same task using the existing OpenClaw model/session instead of stopping.

```
OpenClaw cron (every N min)
  → isolated session (lightContext, tiny prompt)
    → pre-check gate: gh CLI checks for eligible trigger-label issues
      → no eligible issues → NO_REPLY (no claude invoked, no quota used)
      → eligible issues found → try exec: claude -p --model <model> --add-dir <repo> "<task prompt>"
        → success: Claude Code reads .agents/ files, does all real work
        → unavailable/error/rate-limited: fall back to the existing OpenClaw model/session
          → OpenClaw model reads the same .agents/ files and executes the same task directly
      → return the completed work summary, regardless of engine used
  → announce to Telegram (delivery)
```

Fallback rules:
- Priority 1 is always Claude Code.
- Priority 2 is the existing OpenClaw model/session, used only when Claude Code is not available or cannot complete because of tool/runtime/auth/rate-limit/quota errors.
- The fallback model must follow the same `.agents/WORKFLOW.md`, agent-specific file, `AGENTS.md`, label rules, GitHub updates, QA evidence requirements, and cleanup requirements.
- Do not skip eligible work solely because Claude Code is temporarily unavailable.
- If both Claude Code and the OpenClaw fallback are blocked, report the blocker clearly instead of silently failing.

### Pre-check gate (quota savings)

Every cron-run agent MUST perform a lightweight pre-check before invoking
`claude -p`. The pre-check uses the `gh` CLI (or equivalent GitHub API call)
to determine whether any eligible trigger-label issues exist. If none are
found, the session returns `NO_REPLY` immediately without spawning Claude Code.

This avoids burning Claude Code subscription quota on no-op runs.

Pre-check steps per agent:

| Agent     | Pre-check query                                               |
| --------- | ------------------------------------------------------------ |
| Agent PM  | `gh issue list --label "to be planned" --state open`        |
| Agent Dev | `gh issue list --label "in progress" --state open` (guard), then `gh issue list --label "todo" --state open` and `gh issue list --label "feedback" --state open` |
| Agent QA  | `gh issue list --label "qa in progress" --state open` (resume guard), then `gh issue list --label "qa ready" --state open` |

If the Agent Dev guard query returns results (an `in progress` issue exists), the cron session still invokes Claude Code so the global in-progress guard can run: Agent Dev verifies whether the issue is done (repairs the handoff), actively claimed by another agent (reports and stops), or resumable (resumes it). It must not start a new `todo`/`feedback` issue while a valid `in progress` issue exists. If the Agent QA guard query returns results (`qa in progress` exists), Agent QA resumes the oldest valid QA-in-progress issue instead of starting a new `qa ready` issue.

Token cost: No-op runs cost only a GitHub API call. Real work runs use the
Claude Code subscription — separate quota.

### Permissions

Claude Code runs with `--permission-mode auto` which auto-accepts file and bash
operations within the workspace. Agents must still follow the hard constraints
defined in their `.agents/agent-<role>.md` files (never merge, never push to
main directly, only implement acceptance criteria, etc.).

### Portability and host configuration

These files always refer to exactly one repository: **the repository that contains this `.agents/` directory** (the "target repo"). Placeholders used throughout the files are supplied by the host project's cron wrapper/prompt:

- `<owner>/<repo>` — the GitHub slug of the target repo (used in `gh --repo` pre-check commands).
- `<repo-path>` — the local checkout path of the target repo.
- `<notes-repo-local-path>` / `<notes-repo-url>` — optional companion notes repository for project context. Skip notes steps if not configured.
- `<runtime-env-file-path>` — optional local runtime env file for env-dependent tests. Report a blocker if required but not configured.

To reuse this workflow in another repo:
1. Copy the `.agents/` directory (WORKFLOW.md, agent-pm.md, agent-dev.md, agent-qa.md)
2. Supply concrete values for the placeholders above in the cron wrapper/prompt, and adjust any project-specific conventions
3. Set up cron jobs pointing to the new repo path with the same wrapper pattern

## PR and issue linking

Every PR must explicitly link its related GitHub issue in the PR body. Use a full issue URL or GitHub closing/reference keyword such as `Fixes #<issue-number>`, `Closes #<issue-number>`, or `Related issue: <full URL of the issue in this repository>`.

If a PR is a follow-up, feedback fix, supplement, or stack on another PR, the PR body must also link the related parent/older PR. The related issue body should include a `Related PRs` section when multiple active PRs belong to the same issue.

Do not leave active PRs discoverable only by branch name, title, comments, or agent memory. The issue/PR relationship must be visible from GitHub.

## Playwright E2E test requirement

Every user story or issue spec MUST include a Playwright E2E test section. This is mandatory for all issues that touch the UI, including fixes, features, and chores.

- Agent PM must include a "Playwright E2E tests" section in every spec, listing the specific E2E test cases tied to the acceptance criteria.
- Agent Dev must implement the Playwright E2E tests listed in the spec alongside the feature/fix. Tests are part of the deliverable, not an afterthought.
- Agent QA must verify that the Playwright E2E tests pass as part of the QA review. If tests are missing or failing, the task goes back to `feedback`.
- If an issue is a pure backend/infra change with no UI surface, the spec must explicitly state "No E2E tests needed — backend-only change" with justification.

## Real data requirement

All agents must use real application data for development, testing, and QA across all pages. Static, hardcoded, mock, or fixture-only page data is not acceptable as proof that a page or feature works.

- Agent PM must write specs and acceptance criteria that expect real data-backed behavior, including empty/loading/error states when real records are absent.
- Agent Dev must implement pages and UI states against real data sources, not hardcoded demo/static records. If required records do not exist for the flow, seed the database using the project's approved seed/migration/factory path and document the seed data.
- Agent QA must verify pages against real application data from the database/API. If the needed data is unavailable, QA must seed the database before testing when safe and supported by the project. If seeding is not possible, QA must mark the test as blocked/feedback instead of passing with static data.
- Any seeded test data must be documented in the issue/PR QA notes, including what was seeded, how it was seeded, and how another agent can reproduce it.
- Do not mark an issue `review ready` based only on static screenshots, hardcoded page states, mocked fixture data, Storybook-only views, or local-only fake data unless the issue is explicitly scoped to that isolated fixture and the human owner approves that exception.

## Active ticket dependency check

Before finalizing any ticket or moving it to the next state, the owning agent must check whether the current ticket is dependent on, linked to, related to, duplicated by, or blocked by any other active GitHub issue or PR.

The check must include:

- Explicit links in the issue body and all comments.
- GitHub keywords and relationship language such as `blocked by`, `depends on`, `related to`, `duplicate of`, `parent`, `follow-up`, `supersedes`, and `part of`.
- Open issues and PRs with overlapping scope, shared screenshots/evidence, shared affected UI/components, or matching Figma/code references.
- Existing PRs or branches that already implement, partially implement, or conflict with the ticket.

If an active dependency, blocker, duplicate, conflict, or related ticket exists, document it in the ticket's `Dependencies` / related-ticket section and in the GitHub issue comment before transitioning labels. If the relationship blocks safe development or review, transition to `need confirmation` instead of the normal next state and ask the specific confirmation needed. If no active relationship exists, explicitly state `None found` in the Dependencies section or final comment.

### Derive before asking

The owning agent must not ask an open confirmation question until it has tried to derive the answer from all available project context:

- Related active GitHub issues and PRs.
- The current issue body, comments, screenshots, Figma links, and other evidence.
- Relevant source code and existing product patterns.
- The project notes repository context and brief (if configured — see "Project brief and notes alignment").

If another active issue or PR answers the question, document the answer as `Resolved from #<issue-or-pr>: <answer>` instead of asking the human again.

If another active issue defines the parent context, entry point, shared component, or upstream behavior but is not approved or delivered yet, document it as `Dependency: #<issue-or-pr>` instead of treating it as an unanswered product question.

Only ask the human when the answer cannot be determined from related issues, design evidence, code, project notes, or documented project decisions.

### Open-question recommendation requirement

When an agent must ask an open confirmation question, it should include its best current recommendation whenever it has enough context to form one. The question should separate the uncertainty from the recommendation, for example:

- `Question: <what needs confirmation>`
- `Recommendation: <recommended answer or option>`
- `Why: <short reason based on code, design evidence, related issues, or project notes>`

If the agent does not have enough evidence to recommend an answer safely, it must say `No recommendation yet` and explain what evidence is missing. Do not present guesses as recommendations.


## Project brief and notes alignment

If the project has a companion notes repository, its canonical project context and discovery notes are kept at:

- Local path: `<notes-repo-local-path>`
- Source: `<notes-repo-url>`

Before creating, planning, finalizing, developing, or reviewing a ticket, the owning agent must use these notes as project context and make sure the ticket remains aligned with the project brief. At minimum, read `README.md` and `context.md` when unfamiliar with the area, then inspect the most relevant files for the ticket, such as:

- `spec/` for canonical domain rules, glossary, states, permissions, notifications, handoffs, source of truth, and compliance lineage.
- Design review notes, design screen references, and story-to-screen maps for design/screen alignment.
- `user-stories/` and discovery documents for backlog intent and accepted user flows.

If the project has no notes repository configured, skip the notes steps and rely on the issue evidence, source code, and in-repo documentation.

If the ticket conflicts with the notes, is underspecified compared with the brief, or the agent is confused after checking the notes, do not guess. Ask the needed clarification directly in the GitHub ticket, record the relevant note/file reference, and use `need confirmation` when the ambiguity blocks safe work.



## Process ownership and dev server safety

One issue at a time must include process ownership, not only labels. Agents should avoid leaving behind dev/test servers, but one agent must not treat another agent's legitimate active server as an automatic blocker.

For project dev work:

- Before starting a dev server, E2E run, or long-running local process, check existing project dev-server, Playwright, npm, and worktree Node processes.
- Identify ownership where possible: current agent/current task, stale interrupted run, another active agent/session, or unrelated system/user process.
- Each agent is responsible for not running multiple project dev/test servers by itself. Reuse or safely stop its own stale processes before starting another.
- Do not kill or block solely because another agent has a legitimate active process. If another agent occupies a needed port, use a safe alternate port or report/coordinate.
- Always clean up dev/test processes started by the agent on success, failure, timeout, interruption, and restart recovery.

## Handoff protocol

Each agent only picks up tasks with its trigger label. Agents must work on only one issue at a time to preserve context. Do not pick up, plan, develop, review, or update multiple issues in the same run.

Before working on any issue, the agent must fully inspect the issue context and evidence before planning, developing, reviewing, or asking for confirmation:

- Read the full issue body.
- Read all existing comments on that issue.
- Inspect all attached or embedded screenshots/images.
- Open and check all Figma links, including linked nodes/frames when available.
- Check all other URLs, documents, videos, logs, and attachments referenced by the issue or comments.
- For GitHub `user-attachments` URLs, do not rely on unauthenticated fetch results. In private repos these URLs may return `404` without authentication even when the attachment is valid. Use authenticated GitHub access/the configured GitHub token before treating an attachment as unavailable.
- Treat evidence as part of the spec, not optional context.
- Only ask for confirmation after the available evidence has been inspected, or when access limits, missing permissions, expired links, API/rate limits, or unavailable attachments genuinely block inspection.

### Mandatory code inspection

Before asking any confirmation question or writing a spec, the agent MUST inspect the relevant source code in the repository. This applies to all agents, especially Agent PM during planning.

- Identify the files, components, and functions related to the issue (e.g., if the issue is about a button in the Portfolio filter bar, read the Portfolio view component, the button component, and any shared UI components involved).
- Read the actual source code using authenticated GitHub API access or a local clone.
- Derive answers from the code wherever possible: styling, layout, state management, data flow, component structure, existing patterns, and configuration.
- Only ask for confirmation when something genuinely cannot be determined from the code and the available evidence. Do not ask questions that the code already answers.
- Include a "Code reference" section in the PM spec citing the specific files, line patterns, and current behavior observed in the source.
- If the issue references a Figma design, attempt to fetch and compare the Figma design against the current code before asking what doesn't match.

Comments may contain human clarifications, prior agent summaries, QA findings, blockers, or approval decisions, and must be treated as part of the task context.

After completing work, the agent transitions the label to hand off to the next agent. No agent should work on a task outside its trigger labels.

After an agent completes any action, including the initial QA transition from `qa ready` to `qa in progress`, the agent must update or notify the related channel with a concise summary of what changed, the resulting state label, and any blocker or confirmation needed.

After each action on an issue, including the initial QA transition from `qa ready` to `qa in progress`, the agent must also add a new comment on the related GitHub issue with a concise summary of what changed, the resulting state label, and any blocker or confirmation needed. The comment must contain the actual rendered message body. Never post local file paths, temp file references, shell redirection tokens, or placeholder text such as `@/tmp/...`.

| Agent     | Trigger labels   | Output labels                |
| --------- | ---------------- | ---------------------------- |
| Agent PM  | to be planned    | plan approval or need confirmation |
| Agent Dev | todo, feedback   | qa ready or need confirmation |
| Agent QA  | qa in progress (resume), qa ready (new) | review ready, feedback, or need confirmation |


## Local workspace cleanup at handoff

Local clones and worktrees are disposable once the canonical work is safe on the remote. **Cleanup happens at handoff** — the moment an issue is moved to `qa ready`, `need confirmation`, `review ready`, or `feedback`, the owning agent must clean up its local workspace in the same turn, not later.

Cleanup steps at handoff (`qa ready`, `need confirmation`, `review ready`, or `feedback`):

1. Verify `git status --short` is clean, or remaining files are only disposable build/cache output.
2. Verify the branch was pushed to the appropriate remote(s).
3. Verify the PR/MR or issue has the final useful context, screenshots, logs, notes, and verification evidence.
4. Remove the worktree: `git worktree remove <worktree-path>` (or `git worktree prune` if already deleted).
5. Delete bulky generated folders from the worktree before removal if not already done: `node_modules`, `.next`, build outputs, caches, temp dirs.
6. Verify no temporary dev/test server process was left behind by this run. Stop any `next-server`, Playwright, or npm child process started for verification.
7. Confirm disk space is reclaimed after cleanup.

Do not keep completed worktrees around "in case QA sends feedback." If feedback comes later, create a fresh worktree from the PR branch at that time.

Keep only the smallest canonical checkout (main branch) needed for the next run. Do not delete another agent's active workspace without checking its current session/cron status.

## Completion

After `review ready`, a human reviewer merges the PR and transitions the label to `done`.
