# Headroom Agent System

How agent delegation works in Headroom. Read alongside [AGENTS.md](../AGENTS.md) (coding standards and architectural boundaries).

> This file is **not** loaded into sessions automatically; only `AGENTS.md` is. The binding routing table and delegation rules live in `AGENTS.md` §6. Keep the two in sync when either changes.

---

## Core Principle

Use the smallest amount of context and the fewest agents needed to complete each task safely.

The main session is the **orchestrator**: it classifies the task, gives each agent one bounded job with only the context it needs (file paths, line ranges, the decision to make), and **reviews every result** before acting on it. Cheaper models make more mistakes; the orchestrator's review is where they are caught.

```
Main session (classify) → optional research/plan → scoped implementation → verify → review
```

- Only the main session delegates. Subagents never spawn other subagents.
- Independent jobs (e.g. two unrelated read-only investigations) run **in parallel**; dependent jobs run in order.
- Never build long automatic chains. Stop and ask the user when a step needs a decision.

---

## Model Tiers (orchestrator–worker)

These are the Claude Code names for the version-free **deep / standard / fast** tiers in `AGENTS.md` §6 (`opus`, `sonnet`, `haiku` are aliases that always resolve to the newest model in that family). Codex and Antigravity map the same tiers in `.codex/agents/` and `.agents/agents/`.

| Role | Model | Does | Agents |
|---|---|---|---|
| **Orchestrator** | **Opus** (the main session) | Understands the request, researches and plans the design, splits the work, reviews every result, makes every decision. | — (run the main session on Opus in the app) |
| **Implementer** | **Sonnet** | Writes, fixes and reviews code for a clearly scoped job. | `implementer`, `bug-fixer`, `uiux-engineer`, `code-reviewer` |
| **Grunt work** | **Haiku** | High-volume, well-defined jobs: searching and reading docs or code, gathering sources, build/typecheck runs, checklists and sweeps. | `researcher`, `qa-test-agent`, `code-auditor` (and the built-in `Explore`) |

- **Haiku gathers, Opus judges.** Research agents return sourced findings; the orchestrator weighs them and decides. Never act on a Haiku conclusion without review.
- **Design stays with the orchestrator.** Planning a data model, sync strategy or migration is the orchestrator's own job, not a subagent's.
- **Defaults:** `.claude/settings.json` sets `CLAUDE_CODE_SUBAGENT_MODEL=sonnet`, so any agent without its own `model:` (including the built-in general-purpose agent) runs on Sonnet, not the orchestrator's Opus.
- **Bump up** one tier for a single call when a job proves harder than expected (pass `model: opus` or `model: sonnet` for that call); **bump down** anything that is really a lookup or a checklist.

---

## Available Agents

| Agent | Model | Scope & Purpose | Do NOT Use For |
|---|---|---|---|
| `researcher` | Haiku | Gathers sourced findings the repo can't provide: library options, browser behaviour, API docs. Read-only, can search the web; returns facts, not decisions. | Deciding between options, or questions answerable by reading the code. |
| `implementer` | Sonnet | Scoped feature additions, component tweaks, API route fixes in `src/` and `server/`. | Broad architecture changes, open-ended research. |
| `bug-fixer` | Sonnet | Fixing bugs with a reproduction or located cause: reproduce, minimal fix, verify. | Broad refactoring or cosmetic restyling. |
| `uiux-engineer` | Sonnet | Focus HUD ergonomics, keyboard shortcuts (`Ctrl+K`, `N`, `Esc`), theming, sound and confetti. | Backend database logic or server routing. |
| `code-reviewer` | Sonnet | High-signal review for state corruption, WIP limit leaks, sync races, security gaps. | Trivial copy or style changes. |
| `qa-test-agent` | Haiku | Runs `npm run build`, checks types, validates JSON backups, reports results. | Writing features or fixing bugs. |
| `code-auditor` | Haiku | Post-change sweep: dead code, orphaned imports, bypassed WIP checks, unhandled `localStorage` errors. | General coding or feature requests. |

---

## Task Classification & Routing

Classify the task first (categories match `AGENTS.md` §6):

| Category | Description | Example | Routing Flow |
|---|---|---|---|
| **A — Trivial** | Copy change, CSS nit, single-file typo | Update keyboard cheat sheet text | **Main session only** (no subagents). |
| **B — Scoped Implementation** | Target files already identified | Add a priority filter to `FocusHUD.tsx` | `implementer` → `qa-test-agent`. |
| **C — Investigation Required** | Bug with unknown cause or state desync | "Why does the timer pause when switching tabs?" | `Explore` (read-only) → `bug-fixer` → `qa-test-agent`. |
| **D — High-Risk State/Sync** | localStorage, sync protocol, WIP limit invariants | Changes to `src/utils/sync.ts` or `server/db.js` | `implementer` → `qa-test-agent` → `code-reviewer`. |
| **E — Architectural Change** | New data model, sync redesign, auth system | Introducing IndexedDB or CRDT sync | `researcher` (if outside facts needed) → orchestrator writes the plan → **user approval** → `implementer` → `qa-test-agent` → `code-reviewer` → `code-auditor`. |
| **F — UI/UX Ergonomics** | HUD layout, keyboard interactions, sound effects | Audio feedback on subtask completion | `uiux-engineer` → `qa-test-agent` → optional review. |

---

## Retry Limits & Escalation

- **Implementation agents (`implementer`, `bug-fixer`, `uiux-engineer`):** one attempt plus at most **two repair attempts** when verification fails (`npm run build` or a runtime error). If the second repair fails, STOP and report the failure to the user.
- **Escalate a tier** instead of retrying a third time on the same model.
- Anything outward-facing (push, deploy, publishing) still needs the user's approval, whatever agent is running.

---

## Context Budget Rules

- Never send whole file trees when a targeted subset is enough.
- Pass specific file paths and short line-range summaries between agents.
- Don't repeat a search another agent already did; reuse its findings.
- Keep agent descriptions short: they are all loaded to decide delegation.
