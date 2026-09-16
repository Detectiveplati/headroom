# Headroom — AI Assistant Context & Operating Manual

Read this file first. It contains universal engineering standards, model selection policies, and delegation routing for **Headroom**. Specialized agent details live in `.claude/agents/`; operating procedures and worked examples live in `.claude/README.md`.

---

## AI Engineering Standards

These standards govern all AI-driven development in this repository.

### Core Philosophy
The goal is not to generate code quickly; the goal is to build software that is robust, clean, and cognitively ergonomic. Headroom is built to eliminate attention fragmentation and cognitive overload. Every implementation must respect local-first reliability and keep code simple, maintainable, and strictly typed.

### 1. Architecture Before Code
Never start writing code blindly. First analyze affected files, React state flow, local-storage interactions, and backend API contracts. If requirements or architecture are ambiguous: stop, clarify, and explain the tradeoffs.

### 2. Extend Before Creating
Before scaffolding a new component, modal, utility, or helper, inspect existing code in `src/components/` and `src/utils/`. If an existing component can be extended cleanly, extend it. Avoid duplicate logic.

### 3. Reject AI Slop
Do not introduce duplicate utility functions, inconsistent styling, overlapping state variables, or conflicting date/time formats. All code in this repository must appear as if written by a single disciplined senior engineer.

### 4. Small, Contained Diffs
Produce clean, focused PR-sized changes (typically 50–300 lines of code). Never emit giant unmanageable rewrites unless explicitly instructed.

### 5. Single Source of Truth for State
Task state, active stopwatch status, settings, and board keys must each have a single canonical owner in state. Never maintain desynchronized shadow copies of state.

### 6. Defend Cognitive Invariants
- **Strict 2-Task WIP Limit:** Hard guardrail preventing users from taking on more than 2 tasks in "In Progress" simultaneously. Never bypass this in UI handlers, keyboard shortcuts, or background sync.
- **Persistent Focus HUD:** The sticky cockpit bar must always reliably display the active task, live stopwatch, subtask progress, and one-click completion.
- **Immediate Brain Dump:** `Ctrl+K` and `N` must reliably capture incoming distractors into the Backlog without interrupting active work.

### 7. Local-First Invariants
- Always read safely from `localStorage` with structured fallbacks.
- Background sync to `/api/board` must never block local rendering or delete un-synced offline updates.
- Ephemeral timer ticks must never trigger continuous cloud sync requests or flood disk storage.

### 8. Explain Architectural Decisions
Conclude meaningful changes with a brief summary explaining what was changed, why it was designed that way, and what edge cases were addressed.

### 9. Self-Review
Before presenting completed changes, perform a self-review:
- Check for unused imports and variables.
- Ensure event listeners (`keydown`, `visibilitychange`) have cleanup return functions in `useEffect`.
- Run `npm run build` to verify clean TypeScript compilation.

### 10. Session Summary — Always Required
After **every response** that makes a code change or git commit, include a plain-language summary block at the very end:

```markdown
---
### ✅ What happened
- [One sentence describing the main change]
- [Notable details or edge cases handled]
- [Build status: verified via npm run build]
```

---

## Model Selection Policy

| Tier | Model Identifier | Primary Responsibility |
|---|---|---|
| **Haiku** | `claude-haiku-4-5` | Mechanical checks, lint/typecheck reporting, dead code auditing (`qa-test-agent`, `code-auditor`). |
| **Sonnet** | `claude-sonnet-5` | **Default lead model** for all feature implementations, bug fixes, UI/UX refinement, and code reviews (`implementer`, `bug-fixer`, `uiux-engineer`, `code-reviewer`). |
| **Opus** | `claude-opus-4-8` | Reserved for deep architectural restructuring or complex mathematical optimizations. **Requires explicit user approval before invoking.** |

---

## Task Classification & Agent Routing

| # | Task Category | Examples | Recommended Routing |
|---|---|---|---|
| **A** | **Trivial Fix** | Typo in button label, CSS margin tweak, shortcut doc fix | **Main session directly** (no subagent). |
| **B** | **Scoped Feature/Bug** | Adding a tag filter, updating subtask ordering, adding sound trigger | `implementer`. |
| **C** | **Unclear Bug Investigation** | Timer drift across inactive tabs, unexpected local-storage reset | Read-only exploration → `bug-fixer`. |
| **D** | **High-Risk Sync/State** | Modifying `src/utils/sync.ts`, `server/db.js`, or conflict resolution | `implementer` → `code-reviewer`. |
| **E** | **Architecture/Storage** | Migrating to IndexedDB, introducing WebSocket live sync, auth rework | `architect-planner` → user review → `implementer`. |
| **F** | **Cockpit UI/UX** | Redesigning Focus HUD, keyboard navigation ergonomics, confetti/sound | `uiux-engineer` → optional review. |

---

## Project Overview

- **Name:** Headroom 🧠
- **Core Value Proposition:** An interactive, high-clarity focus Kanban board designed specifically to combat task forgetfulness, context-switching fatigue, and attention fragmentation.
- **Frontend:** React 18, TypeScript, Vite 6, Tailwind CSS, Lucide React, Canvas Confetti, Web Audio API synthesizer.
- **Backend:** Lightweight Node.js HTTP server (`server.js`) with PostgreSQL (`pg`) and local atomic JSON file store fallback (`data/boards.json` via `server/db.js`).
- **Dev Server:** Built-in Vite middleware plugin (`syncApiPlugin` in `vite.config.ts`) simulating the production API routes for zero-setup local development.

---

## Commands

```bash
npm run dev      # Start Vite dev server on http://localhost:3000 (includes dev sync API)
npm run build    # Run TypeScript compiler (tsc) and build production bundle to /dist
npm start        # Launch production Node server (server.js) with static hosting & sync API
npm run preview  # Preview production build locally
```

---

## Critical Code Boundaries & Architectural Rules

1. **Dev/Prod API Parity:** Any endpoint added or modified in `server.js` MUST also be mirrored in `vite.config.ts` (`syncApiPlugin`) so development and production run the identical API contract.
2. **Atomic Storage on Windows:** When writing `data/boards.json`, handle potential file locking errors gracefully so rapid writes do not corrupt board state.
3. **No Unchecked `localStorage`:** Never assume `localStorage` data matches current schema. Always handle parse errors and missing properties gracefully.
4. **Clean Web Audio Resumption:** Never call Web Audio methods without ensuring the `AudioContext` is in `running` state via user gesture.
