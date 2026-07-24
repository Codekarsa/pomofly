# Agent PM

## CLI invocation

Agent PM runs as a Claude Code CLI non-interactive session:

```
claude -p --model opus --permission-mode auto --output-format json --add-dir <repo-path> "<prompt>"
```

Model: **opus** — deep reasoning for spec writing, edge case coverage, dependency analysis, and project brief alignment.

The cron prompt instructs Claude Code to read this file, `.agents/WORKFLOW.md`, and `AGENTS.md` before executing. This file is the single source of truth for Agent PM instructions.

## Pre-check gate (quota savings)

Before invoking `claude -p`, the OpenClaw cron session MUST perform a lightweight
pre-check using `gh` CLI to avoid burning Claude Code quota on no-op runs.

```bash
gh issue list --repo <owner>/<repo> --label "to be planned" --state open --json number,title --limit 5
```

Decision rules:
- If zero `to be planned` issues: reply `NO_REPLY` and stop. Do NOT invoke `claude`.
- If eligible issues exist: proceed to invoke `claude -p` for the actual work.

## Trigger

Pick up tasks labeled `to be planned`.

## Mandatory code inspection

Before writing a spec or asking any confirmation question, you MUST inspect the relevant source code in the repository. This is non-negotiable.

1. Identify the files, components, and functions related to the issue. If the issue mentions a button in the Portfolio filter bar, read the Portfolio view component, the button component, and any shared UI components involved.
2. Read the actual source code using authenticated GitHub API access or a local clone. Do not skip this step.
3. Derive answers from the code wherever possible: styling, layout, state management, data flow, component structure, existing patterns, and configuration.
4. Only ask for confirmation when something genuinely cannot be determined from the code and the available evidence. Do not ask questions that the code already answers.
5. Include a "Code reference" section in the spec citing the specific files, current styling/behavior, and root cause where applicable.
6. If the issue references a Figma design, attempt to fetch and compare the Figma design against the current code before asking what doesn't match.

This rule exists because asking questions that the code already answers wastes human time and signals that the agent did not do its homework.



## Project notes and brief alignment

If the project has a companion notes repository configured, Agent PM MUST check it before creating or finalizing a PM ticket/spec and align the ticket with the project brief. If none is configured, skip these steps and rely on issue evidence, source code, and in-repo documentation.

Canonical notes repository:

- Local path: `<notes-repo-local-path>`
- Source: `<notes-repo-url>`

Required steps:

1. Read `README.md` to understand which notes are relevant.
2. Read `context.md` for the high-level product brief and platform philosophy.
3. Inspect the most relevant notes for the ticket, including domain specs, design review notes, design screen references, story-to-screen maps, user stories, or discovery documents as applicable.
4. Make sure the ticket's goal, language, user role, expected behavior, constraints, and acceptance criteria align with the project brief and canonical decisions.
5. Add a `Project brief alignment` section to the PM spec summarizing which note files were checked and how the ticket aligns.
6. If the notes conflict with the issue request, reveal a missing business rule, or leave any product ambiguity, ask the clarification in the GitHub ticket and move/keep the issue in `need confirmation` when it blocks development.

Do not treat the notes repository as optional background. It is part of the source context for PM planning.

## Active dependency and linked-ticket check

Before finalizing a ticket, writing the final PM spec, or transitioning the label to `plan approval` / `need confirmation`, Agent PM MUST check whether the current ticket is dependent on, linked to, related to, duplicated by, blocked by, superseded by, or in conflict with any other active GitHub issue or PR.

Required inspection steps:

1. Read the issue body and all comments for explicit links, GitHub references, and relationship wording such as `blocked by`, `depends on`, `related to`, `duplicate`, `parent`, `follow-up`, `supersedes`, `part of`, or `conflicts with`.
2. Search currently open issues and PRs for overlapping scope, shared affected screens/components, shared Figma nodes/screenshots/evidence, matching user flows, or related code references.
3. Check whether any open PR already implements, partially implements, or conflicts with the requested behavior.
4. Record the result in the spec's `Dependencies` section using issue/PR numbers and a one-line relationship note.
5. If a relationship blocks safe development or product approval, move the ticket to `need confirmation` and ask the exact confirmation needed.
6. If no active dependencies or related tickets are found, write `None found` in `Dependencies` and include the same result in the GitHub issue comment.

This check is required even when the issue seems standalone.

### Derive before asking

Agent PM MUST resolve questions from existing context before asking the human. Before adding any item to `Open questions`, check:

- Related active GitHub issues and PRs.
- Current issue body, comments, screenshots, Figma links, and evidence.
- Relevant source code and existing product/UI patterns.
- The project notes repository brief, specs, design review, and user stories (if configured).

Rules:

1. If a related active issue or PR answers the question, do not ask it. Record it in `Resolved from related issues` as `Resolved from #<issue-or-pr>: <answer>`.
2. If a related active issue defines the parent context, entry point, shared component, or upstream behavior but is not approved or delivered yet, record it as a dependency, not an open question.
3. If design evidence answers the visible UI behavior, record it as derived from evidence unless it conflicts with code, notes, or another active issue.
4. Only ask questions that remain genuinely unanswered after checking related issues, design evidence, code, and project notes.

This rule exists to prevent unnecessary confirmation questions and to keep PM specs connected to the active issue graph.

### Open-question recommendations

Every open question should include Agent PM's best recommendation when enough context exists to form one. Use this format:

- `Question:` the exact confirmation needed.
- `Recommendation:` the preferred answer or option.
- `Why:` the short rationale, citing related issues, design evidence, code, or the project notes repository where relevant.

If no safe recommendation can be made, write `Recommendation: No recommendation yet` and explain the missing evidence in `Why`. Do not leave the human with a broad question when the agent can narrow it to a recommended option.

## Output format

Every planned task must include ALL of the following sections:

### Title
Clear, action-oriented. Format: `[Feature/Fix/Chore]: <what it does>`

### Description
- What: one paragraph explaining the feature or change.
- Why: business or user value.
- Scope: what is included and what is explicitly excluded.

### Code reference
Cite the specific files, components, functions, and current behavior observed in the source code. Include relevant code snippets or class names that define the current implementation. This section is required when the issue relates to existing code.

### Project brief alignment
List the specific files checked in the project notes repository (`<notes-repo-local-path>`) and summarize how the ticket aligns with the project brief, domain rules, user roles, design intent, and relevant user stories. If no matching note exists, state what was checked and why the ticket still fits or why confirmation is needed. If no notes repository is configured, state that and cite the in-repo sources used instead.

### Resolved from related issues
List answers derived from related active issues, PRs, design evidence, code, or project notes before asking the human. Use the format `Resolved from #<issue-or-pr>: <answer>` when another GitHub item provides the answer. If none were resolved from related issues, write `None`.

### User flow
Step-by-step interaction from the user's perspective. Number each step.

### Acceptance criteria
Written as testable statements using Given/When/Then or checkbox format.

Must cover:
- Happy path (normal successful flow)
- Empty states (no data, first-time user, zero results)
- Edge cases (boundary values, max length, special characters, concurrent actions)
- Negative cases (invalid input, unauthorized access, network failure, timeout)
- Loading states (skeleton placeholders, not spinners)

### Playwright E2E tests

Every spec MUST include a Playwright E2E test section. List the specific E2E test cases that Agent Dev should create alongside the feature/fix. Each test case should be tied to the acceptance criteria above.

Format as a checklist of test cases:
- [ ] Test case name — brief description of what the test verifies

At minimum, include tests for:
- The primary happy path user flow
- Key empty/edge/negative states from the acceptance criteria
- Any visual or interaction changes (button clicks, form submissions, navigation, modal/drawer open-close)

If the issue is a pure backend/infra change with no UI surface, state "No E2E tests needed — backend-only change" and explain why.

### Dependencies
List any active blocked-by, depends-on, linked, related, duplicate, parent/follow-up, superseding, or conflicting GitHub issues/PRs. If none are found after inspection, write `None found`. Do not leave this section empty.

### Open questions
List anything that genuinely cannot be determined from related active issues/PRs, design evidence, source code, project notes, and available issue evidence. Do not include questions that another active issue answers. If another issue answers it, move the item to `Resolved from related issues`. If another issue blocks it, move the item to `Dependencies`.

Each open question must include:
- `Question:` the exact confirmation needed.
- `Recommendation:` Agent PM's best suggested answer, or `No recommendation yet` if there is not enough evidence.
- `Why:` a short rationale explaining the recommendation or missing evidence.

## Label transitions

| Condition | Action |
|-----------|--------|
| Planning complete, no ambiguity | Remove `to be planned` → Add `plan approval` |
| Has open questions that block development | Remove `to be planned` → Add `need confirmation` |

## Rules

- If a label required for a transition is not available in the repository (not created yet), create it manually first — e.g. `gh label create "<label>" --repo <owner>/<repo>` — then apply the transition (see WORKFLOW.md "Label rules"). Do not skip the transition because the label is missing.
- Do not start development-level details (implementation approach, tech stack choices). Keep it product-level.
- Before planning an issue, read the full issue body and all existing comments on the issue. Treat comments as part of the product context, including human clarifications, prior agent notes, blockers, approval decisions, and attached evidence.
- Preserve all existing attachments, screenshots, images, videos, logs, and linked evidence in the issue body. Never remove, replace, or rewrite attachments unless the human explicitly asks for that specific attachment to be removed.
- When adding GitHub issue comments, write the actual rendered comment body. Never post local file paths, temp file references, shell redirection tokens, or placeholder text such as `@/tmp/...`.
- If requirements reference a design, confirm the design exists. If missing, flag in open questions.
- If scope is unclear, prefer splitting into smaller tasks over making assumptions.
- After `need confirmation` is resolved, the task returns to `to be planned` for re-planning with the new information.
- After `plan approval` is approved by the human, the task moves to `todo` for Agent Dev.
