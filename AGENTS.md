# AGENTS.md — AI Engineering Rules & Operating Manual for Headroom

> **Version:** 2.0  
> **Scope:** Governs all AI-assisted development across the Headroom repository.  
> Before writing or modifying any code, read and follow every rule here. These are mandatory engineering invariants.

---

## 0. Project Overview & Boundaries

- **Application:** Headroom 🧠 — A high-clarity, cognitive-ergonomic Kanban board designed to combat task forgetfulness, context-switching fatigue, and attention fragmentation.
- **Frontend Stack:** React 18, TypeScript (strict), Vite 6, Tailwind CSS, Lucide React, Canvas-Confetti, Web Audio API synthesizer.
- **Backend Stack:** Node.js native HTTP server (`server.js`), PostgreSQL (`DATABASE_URL` via `pg`), with fallback to atomic local JSON storage (`data/boards.json` via `server/db.js`).
- **Dev Server:** Built-in Vite middleware plugin (`syncApiPlugin` in `vite.config.ts`) simulating production endpoints for zero-setup local development.

### Common Commands

```bash
npm run dev      # Start Vite dev server on http://localhost:3000 (includes dev sync API)
npm run build    # Run TypeScript compiler (tsc) and build production bundle to /dist
npm start        # Launch production Node server (server.js) with static hosting & sync API
npm run preview  # Preview production build locally
```

---

## 1. What AI Must NEVER Do

1. **NEVER bypass the 2-task WIP limit:**  
   The WIP limit is the core cognitive guardrail of Headroom. Never permit a code change where drag-and-drop, modal creation, task editing, or remote sync pushes more than 2 tasks into the `doing` column without triggering the `WipLimitModal` guardrail.
2. **NEVER connect live timer ticks directly to cloud sync or disk writes:**  
   Ticking an active stopwatch (1 second interval) must NEVER trigger debounced `POST /api/board` network requests or continuous `localStorage` writes. Ephemeral timer state must be managed cleanly without polluting the network or disk.
3. **NEVER create Dev/Prod API divergence:**  
   Whenever modifying an endpoint in `server.js`, you MUST update the corresponding handler in `vite.config.ts` (`syncApiPlugin`). Dev and Prod must behave identically.
4. **NEVER use `any` or suppress TypeScript:**  
   No `any` types. No `@ts-ignore` without an explicit explanatory comment. All task, subtask, settings, and sync payloads must be strictly typed in `src/types.ts`.
5. **NEVER write unvalidated payloads to storage:**  
   Never assume external JSON from `localStorage` or `/api/board` conforms to expectations. Always defensively check properties before invoking methods like `.map()`, `.filter()`, or `.trim()`.
6. **NEVER trigger Web Audio errors:**  
   Browser autoplay policies suspend the `AudioContext` until user interaction. Never call sound methods without verifying audio context state (`running`) and respecting user mute preferences.
7. **NEVER execute destructive git commands without explicit user approval:**  
   Never run `git reset --hard`, `rm -rf`, or force-overwrite branches. Running `git push` is only permitted after explicitly asking for and receiving the user's approval.

---

## 2. Engineering Standards & Code Quality

1. **Architecture Before Code:**  
   Never start writing code blindly. First analyze affected files, React state flow, local storage interactions, and backend API contracts. If requirements or architecture are ambiguous: stop, clarify, and explain the tradeoffs.
2. **Extend Before Creating:**  
   Before scaffolding a new component, modal, utility, or helper, inspect existing code in `src/components/` and `src/utils/`. If an existing component can be extended cleanly, extend it. Avoid duplicate logic.
3. **Reject AI Slop & Duplication:**  
   Do not introduce duplicate utility functions, inconsistent styling, overlapping state variables, or conflicting date/time formats. All code in this repository must appear as if written by a single disciplined senior engineer.
4. **Small, Contained Diffs:**  
   Produce clean, focused PR-sized changes (typically 50–300 lines of code). Avoid giant unmanageable rewrites unless explicitly instructed.
5. **Single Source of Truth for State:**  
   Task state, active stopwatch status, settings, and board keys must each have a single canonical owner in state. Never maintain desynchronized shadow copies of state.
6. **Explain Architectural Decisions:**  
   Conclude meaningful changes with a brief summary explaining what was changed, why it was designed that way, and what edge cases were addressed.

---

## 3. Local-First State Architecture Rules

Headroom operates under a **local-first** paradigm:

1. **Instant Offline Render:**  
   The application must immediately load and render from `localStorage` on initial mount. Remote sync occurs asynchronously in the background.
2. **Deterministic Conflict Resolution:**  
   - When pushing to `/api/board`, include `updatedAt`.
   - If the server has a higher `updatedAt`, return a `409 Conflict` containing the server board state.
   - The client must merge or prompt rather than silently overwriting concurrent remote changes.
3. **Storage Safe Fallbacks:**  
   - In `src/utils/storage.ts`, wrap all `localStorage` access in `try / catch` blocks to prevent quota exceeded or privacy-mode exceptions from crashing the app.
   - If stored data is missing or corrupted, gracefully fall back to `STARTER_TASKS` or `DEFAULT_SETTINGS`.

---

## 4. Keyboard & Cognitive Ergonomics

1. **Global Shortcuts:**  
   - `Ctrl+K` or `N`: Immediately opens the Brain Dump task creation modal to capture distractors into the Backlog without interrupting active work.
   - `Escape`: Closes any open modal or cancels the current inline edit.
   - `?`: Opens the Keyboard Shortcuts cheat sheet.
2. **Focus HUD (Cockpit):**  
   - The top cockpit bar must always stay pinned to the top of the viewport (`sticky top-0 z-40`).
   - It must display the single active task, active elapsed stopwatch, subtask completion count, and quick completion button.

---

## 5. Backend & Security Standards

1. **Response Shapes:**  
   All REST API endpoints must return standard JSON objects:
   - Success: `{ success: true, ...data }`
   - Failure: `{ success: false, error: "Human-readable message" }`
2. **Board Isolation & Ownership:**  
   If a board is accessed with a custom `boardKey`, ensure authenticated users cannot inadvertently or maliciously overwrite other users' private boards.
3. **Atomic File Writes on Windows:**  
   In `server/db.js`, ensure writes to `data/boards.json` handle potential file locking errors (`EPERM`/`EBUSY`) gracefully so rapid writes do not corrupt board state.

---

## 6. Task Classification & Routing Guide

| Category | Description | Example | Routing & Scope |
|---|---|---|---|
| **A — Trivial** | Copy change, CSS nit, single-file typo | Update keyboard cheat sheet text | Direct single-turn fix. |
| **B — Scoped Implementation** | Target files identified, clear requirements | Add a priority filter option in `FocusHUD.tsx` | Scoped code changes + verification. |
| **C — Investigation Required** | Bug with unknown cause or state desync | "Why does timer pause when switching tabs?" | Read-only analysis → targeted fix. |
| **D — High-Risk State/Sync** | LocalStorage, sync protocol, WIP limit invariants | Changes to `src/utils/sync.ts` or `server/db.js` | Implementation + strict review against invariants. |
| **E — Architectural Change** | New data model, offline sync redesign, auth system | Introducing IndexedDB or CRDT sync | Design plan artifact → user approval → implementation. |
| **F — UI/UX Ergonomics** | Focus HUD layout, keyboard interactions, sound effects | Adding audio feedback for subtask completion | Design tuning & ergonomic review. |

---

## 7. Verification Protocol & Session Summary

Before presenting any changes as complete:
1. **Self-Review:** Check for unused imports, ensure event listeners (`keydown`, `visibilitychange`) have cleanup return functions in `useEffect`.
2. **Build Check:** Run `npm run build` to confirm zero TypeScript compilation errors and a clean Vite production bundle.
3. **Functional Verification:** Verify that existing core features (HUD timer, WIP limit dialog, confetti burst, cloud sync indicator) remain functional.
4. **Session Summary (Mandatory):** Conclude your response with the plain-language summary block:

```markdown
---
### ✅ What happened
- [One sentence describing the main change]
- [Notable details or edge cases handled]
- [Build status: verified via npm run build]
```
