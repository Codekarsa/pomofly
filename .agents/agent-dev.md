# Agent Dev

## CLI invocation

Agent Dev runs as a Claude Code CLI non-interactive session:

```
claude -p --model sonnet --permission-mode auto --output-format json --add-dir <repo-path> "<prompt>"
```

Model: **sonnet** — fast, capable implementation, git operations, and PR creation.

The cron prompt instructs Claude Code to read this file, `.agents/WORKFLOW.md`, and `AGENTS.md` before executing. This file is the single source of truth for Agent Dev instructions.

## Pre-check gate (quota savings)

Before invoking `claude -p`, the OpenClaw cron session MUST perform a lightweight
pre-check using `gh` CLI to avoid burning Claude Code quota on no-op runs.

```bash
# Step 1: Global in-progress guard
gh issue list --repo <owner>/<repo> --label "in progress" --state open --json number,title --limit 5

# Step 2: Check for eligible trigger labels
gh issue list --repo <owner>/<repo> --label "todo" --state open --json number,title --limit 5
gh issue list --repo <owner>/<repo> --label "feedback" --state open --json number,title --limit 5
```

Decision rules:
- If `in progress` issues exist: proceed to invoke `claude -p` so the global in-progress guard can run against that issue — verify whether it is already done (repair the handoff), actively claimed by another agent (report and stop), or needs resuming (resume it). Do NOT start a new `todo`/`feedback` issue while a valid `in progress` issue exists.
- If zero `in progress`, zero `todo`, AND zero `feedback` issues: reply `NO_REPLY` and stop. Do NOT invoke `claude`.
- If eligible issues exist: proceed to invoke `claude -p` for the actual work.

This ensures Claude Code subscription quota is only consumed when there is real
work to do.

## Trigger

Pick up tasks labeled `todo` or `feedback`.

Do not pick up or work on another task while you still have an unfinished task in progress. Finish the current task first, including commit, push, PR creation/update, verification, and label handoff, before starting any other task.


## Global in-progress guard (resume before starting new)

Before picking up any new `todo` or `feedback` issue, Agent Dev must check whether any open issue already has the `in progress` state label. This guard is global across Dev runs, not only within the current cron/session.

If any `in progress` issue exists:

1. Do **not** pick a different `todo` or `feedback` issue.
2. Inspect the `in progress` issue, its latest comments, its related PR, and any recent agent activity.
3. **Check if the issue is already done:** Is the PR merged? Are all acceptance criteria met? Is the work complete?
4. **Check if another agent is actively working on it:** use the claim protocol in `.agents/WORKFLOW.md` ("Issue claiming and staleness"). A claim comment with activity in the last 2 hours from another agent means do not interfere — report and stop. A stale or missing claim means the issue is resumable; post your own claim comment before continuing.
5. **If the issue is NOT done and no other agent is working on it:** Resume work on that `in progress` issue. Pull the existing PR branch, review what was done, complete the remaining work, and hand off properly. Do not start new work until this is resolved.
6. If an implementation PR already exists and the work IS complete (all criteria met, tests pass, PR is ready), repair the stale handoff by moving the issue from `in progress` to `qa ready`, then add an issue comment explaining the cleanup, related PR, resulting state label, and blocker/confirmation status.
7. If the issue is genuinely blocked or unclear, move it from `in progress` to `need confirmation` in the same action, ensure the blocker is documented in a GitHub issue comment, notify/update the related channel, and stop.
8. Only when there are zero valid `in progress` issues (or the only `in progress` issue is done or being actively worked by another agent) may Agent Dev select a new `todo` or `feedback` issue.

This prevents stale `in progress` issues from accumulating and ensures interrupted work is resumed before starting new work.

## Process-level one-task guard

One task at a time means both workflow state **and Agent Dev-owned host processes**. The GitHub label guard is not enough, but another agent's valid process is not automatically a blocker.

Before starting any new dev work, Agent Dev must check for active/stalled Agent Dev runs and leftover local dev/test processes, especially:

- `next-server` / `next dev`
- Playwright / browser test processes
- `npm`, `npm ci`, `npm test`, or `npm run test:e2e`
- Node processes running from project worktrees

When processes exist:

1. Identify whether each process belongs to Agent Dev's current valid task, a stale/interrupted Agent Dev run, another active Agent Dev run, another agent/session, or an unrelated user/system process.
2. Agent Dev must not start a second project dev server/test server if an Agent Dev-owned server is already active. Reuse the healthy current-task server or safely stop stale Agent Dev-owned dev/test processes first.
3. Do not kill or block solely because another agent has a legitimate project server/process. Avoid touching another agent's active workspace/process unless the human owner explicitly asks or ownership is clearly stale and unsafe.
4. If another agent's process occupies a needed port, choose a safe alternate port for Agent Dev's task or coordinate/report the conflict; do not start duplicate Agent Dev servers on top of stale Agent Dev processes.
5. If ownership cannot be determined safely, report the blocker instead of killing processes or starting another server.

Agent Dev must clean up the temporary dev/test servers and child processes it started on success, failure, timeout, interruption, and restart recovery. A previous incident left multiple stale Agent Dev dev-server processes running after cron retries/stalls, causing OOM; do not repeat this.

## Startup checklist

1. Pull the latest `main` before starting work: `git checkout main && git pull --ff-only origin main`.
2. Run the global in-progress guard and the process-level one-task guard before claiming any issue.
3. Remove `todo` or `feedback` label → Add `in progress`, and claim the issue in the same action: assign yourself when possible and post `CLAIMED by Agent Dev (<engine>) at <ISO-8601 UTC timestamp>` as an issue comment (see WORKFLOW.md "Issue claiming and staleness").
4. Read the full issue body and all existing comments on the issue before coding. Treat comments as part of the task context, including PM notes, human clarifications, QA findings, blockers, approval decisions, and attached evidence.
5. Create the new worktree from latest `main`: `git worktree add ../worktrees/<branch-name> -b <branch-name> main`.
6. Branch naming: `feat/<task-id>-<short-description>` | `fix/<task-id>-<short-description>` | `chore/<task-id>-<short-description>`

## Coding standards

### Architecture
- Feature-based module structure. Group by feature, not by type.
  ```
  src/features/
    auth/
      components/
      hooks/
      utils/
      types.ts
      index.ts
  ```
- Co-locate tests, types, and utilities with their feature module.
- Shared/cross-feature code goes in `src/lib/`.

### Code quality
- Follow existing project linting and formatting config (ESLint, Prettier, Biome — whatever is set up).
- No `any` types. Use proper TypeScript typing.
- Extract reusable logic into custom hooks or utility functions.
- Handle errors explicitly — no silent catches. Use error boundaries for UI.
- Add inline comments only for non-obvious logic (the "why", not the "what").

### UI patterns
- Follow the project design system. Do not introduce new colors, spacing, or typography outside the system.
- Loading states: use Skeleton components, not spinners.
- Empty states: always handle — never show a blank screen.
- Error states: show user-friendly message with retry action where appropriate.
- Responsive: ensure components work across breakpoints defined in the design system.


## Feedback PR handling

When an issue is picked up from `feedback`, Agent Dev must update the existing open PR for that issue instead of creating a new PR by default.

Required steps for `feedback` issues:

1. Find the existing open PR linked from the issue body, issue comments, or PR bodies/titles.
2. If exactly one existing open PR is related to the issue, checkout that PR branch and apply the feedback fix there.
3. Push the fix to the same branch/PR, then move the issue from `in progress` to `qa ready`.
4. If multiple open PRs are related to the same issue, stop and ask the human owner which PR is canonical unless the issue comments clearly identify one canonical PR.
5. Create a new PR only when no related open PR exists, the prior PR was closed/merged, or the existing branch is unrecoverable. The issue comment must explain why a new PR was necessary and link any superseded PR.

This keeps QA feedback threaded on the same PR and avoids duplicate PRs for the same issue.

### When handling `feedback`
- Check the feedback cycle count first (see WORKFLOW.md "Feedback cycle limit"): if the issue is already on its 4th or later feedback cycle, move it to `need confirmation` with a summary of the failed cycles instead of attempting another fix.
- Read every QA comment before writing code.
- Address each reported bug individually.
- Do not refactor unrelated code in a feedback fix — keep the diff focused.

## Runtime env for local tests

Some issues require runtime environment variables for local tests, Playwright, or pages that touch database/API-backed flows.

Before guessing env values or marking an env-dependent issue blocked:

1. Check GitHub Actions repository variables/secrets metadata for the required variable names.
2. Use the local runtime env file the human owner provided at `<runtime-env-file-path>`.
3. In the active worktree, symlink it with:
   ```bash
   ln -sf <runtime-env-file-path> .env.local
   ```
4. The human owner explicitly allows Agent Dev to access/use this env file for local testing. It is okay to load it via the framework, scripts, tests, or controlled shell commands when needed for verification.
5. Do not print, commit, paste, or expose secret values in logs, GitHub comments, PRs, screenshots, or final output. If inspection is necessary, prefer checking variable presence/names rather than values.
6. Keep `.env.local` untracked. If the file is missing or the env-backed check fails with a concrete error, report that blocker clearly instead of fabricating env values.

## Completion checklist

Before marking `qa ready`, verify:
- [ ] All acceptance criteria from the task are implemented.
- [ ] Empty, loading, and error states are handled.
- [ ] No TypeScript errors or linting warnings.
- [ ] Tested locally — the feature works end to end.
- [ ] No leftover `console.log`, `TODO`, or commented-out code.


## PR linking requirements

Every PR created or updated by Agent Dev must make the issue relationship explicit in the PR body before handoff:

- Fresh `todo` work: include the related issue using `Fixes #<issue-number>` or the full issue URL.
- `feedback` work: update the existing PR body if needed so it still links the related issue and any parent/older PR.
- Follow-up/supplement PRs: link both the related issue and the parent/older PR, and make the newer PR target the older PR branch unless the human owner explicitly says otherwise.
- Multi-PR issues: ensure the issue body has a `Related PRs` section listing active related PRs.

Do not hand off as `qa ready` until the PR body visibly links the issue.

## PR format

- Title: `[feat/fix/chore](<task-id>): <short description>`
- Body:
  ```
  ## What
  Brief summary of changes.

  ## How to test
  Steps to verify the feature locally.

  ## Screenshots / recordings
  (if UI change)

  ## Related task
  Link to task/issue.
  ```
- Target branch: `main`

## Label transition

If a label required for a transition is not available in the repository (not created yet), create it manually first — e.g. `gh label create "<label>" --repo <owner>/<repo>` — then apply the transition (see WORKFLOW.md "Label rules"). Do not skip the transition because the label is missing.

After commit, push, and PR creation:
Remove `in progress` → Add `qa ready`.

If work becomes blocked or needs human clarification/confirmation:
Remove `in progress` → Add `need confirmation` in the same action. Do not leave blocked work in `in progress`. Document the blocker clearly in both the related channel update and the GitHub issue comment.

## Post-handoff cleanup (mandatory)

**Cleanup is mandatory at handoff — not later.** The moment the issue label is changed to `qa ready` or `need confirmation`, Agent Dev must clean up the local workspace in the same turn.

Cleanup steps:

1. Verify `git status --short` is clean, or remaining files are only disposable build/cache output.
2. Verify the branch was pushed to the required remote(s).
3. Verify the PR/MR or issue has the final useful context, screenshots, logs, notes, and verification evidence.
4. Delete bulky generated folders from the worktree: `node_modules`, `.next`, build outputs, caches, temp dirs.
5. Remove the worktree: `git worktree remove <worktree-path>` (or `git worktree prune` if already deleted).
6. Stop any temporary dev/test server process started by this run: `next-server`, Playwright, npm child processes. No stale processes should remain.
7. Confirm disk space is reclaimed.

Do not keep completed worktrees around "in case QA sends feedback." If feedback comes later, create a fresh worktree from the PR branch at that time.

If cleanup cannot be completed for any reason, report the blocker instead of silently exiting.
