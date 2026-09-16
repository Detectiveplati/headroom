# Headroom Agent System

How agent delegation and execution work in Headroom. Read alongside the root [CLAUDE.md](file:///d:/Coding/headroom/CLAUDE.md) (universal rules + routing table) and [AGENTS.md](file:///d:/Coding/headroom/AGENTS.md) (coding standards & architectural boundaries).

---

## Core Principle

Use the smallest amount of context and the fewest agents necessary to complete each task safely. The default delegation flow is:

```
Main session → optional scoped exploration → scoped implementation → optional review/test
```

Never build long automatic chains. Specialists are invoked only when the task genuinely requires them, and only the main session decides to delegate. Subagents must never spawn other subagents.

---

## Available Agents

| Agent | Model | Scope & Purpose | Do NOT Use For |
|---|---|---|---|
| `implementer` | Sonnet | Standard feature additions, UI component tweaks, API route fixes in `src/` and `server/`. | Broad architecture changes, open-ended research. |
| `architect-planner` | Sonnet | Cross-cutting system design: local-first sync protocols, schema migrations, state machines, offline merge logic. | Routine UI tweaks or one-file bug fixes. |
| `code-reviewer` | Sonnet | High-signal review of changes for state corruption, WIP limit violations, sync race conditions, and security gaps. | Trivial copy or style changes. |
| `uiux-engineer` | Sonnet | Design engineering: Focus HUD cockpit ergonomics, keyboard shortcuts (`Ctrl+K`, `N`, `Esc`), dark mode tokens, sound synthesizer & confetti tuning. | Backend database logic or server routing. |
| `bug-fixer` | Sonnet | Investigating and fixing reproduction-ready bugs via strict TDD (failing test/reproduction, minimal fix, verification). | Broad refactoring or cosmetic restyling. |
| `qa-test-agent` | Haiku | Verification specialist: runs `npm run build`, checks TypeScript types, validates JSON backups, and verifies runtime state. | Writing application features or fixing bugs directly. |
| `code-auditor` | Haiku | Post-refactor sweep: finds dead code, orphaned imports, bypassed WIP limit checks, and unhandled `localStorage` errors. | General coding or ad-hoc feature requests. |

---

## Task Classification & Routing

Before executing, classify the task into one of the following categories:

| Category | Description | Example | Routing Flow |
|---|---|---|---|
| **A — Trivial** | Copy change, CSS nit, single-file typo | Update keyboard cheat sheet text | **Main session only** (no subagents). |
| **B — Scoped Implementation** | Target files are already identified | Add a priority filter option in `FocusHUD.tsx` | `implementer`. |
| **C — Investigation Required** | Bug with unknown cause or state desync | "Why does timer pause when switching tabs?" | Read-only exploration → `bug-fixer`. |
| **D — High-Risk State/Sync** | LocalStorage, sync protocol, WIP limit invariants | Changes to `src/utils/sync.ts` or `server/db.js` | `implementer` → `code-reviewer`. |
| **E — Architectural Change** | New data model, offline sync redesign, auth system | Introducing IndexedDB or CRDT sync | `architect-planner` → approval → `implementer` → `code-reviewer`. |
| **F — UI/UX Ergonomics** | Focus HUD layout, keyboard interactions, sound effects | Adding audio feedback for subtask completion | `uiux-engineer` → optional review. |

---

## Retry Limits & Escalation

- **Implementation agents (`implementer`, `bug-fixer`):** One initial attempt + maximum **two repair attempts** if verification fails (`npm run build` or runtime error). If the second repair does not resolve the issue, STOP and report the failure summary to the user.
- **Model Tiers:**
  - **Haiku:** Grunt work, mechanical sweeping, typecheck reporting (`qa-test-agent`, `code-auditor`).
  - **Sonnet:** Default lead model for implementation, architecture, and design (`implementer`, `bug-fixer`, `uiux-engineer`, `architect-planner`).
  - **Opus:** Reserved strictly for complex mathematical or architectural dilemmas. Never invoke Opus without explicit user consent.

---

## Context Budget Rules

- Never send entire full-project file trees when a targeted subset is sufficient.
- Pass specific file paths and concise line-range summaries between agents.
- Avoid duplicate codebase searches; reuse findings within the session.
