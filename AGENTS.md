# AGENTS.md — AI Engineering Rules for Headroom

> **Version:** 1.0  
> **Scope:** Governs all AI-assisted development across the Headroom repository.  
> Before writing or modifying any code, read and follow every rule here. These are mandatory engineering invariants.

---

## 0. Project Context & Boundaries

- **Application:** Headroom — A high-clarity, cognitive-ergonomic Kanban board designed to combat task forgetfulness, context-switching fatigue, and attention fragmentation.
- **Frontend Stack:** React 18, TypeScript (strict), Vite 6, Tailwind CSS, Lucide React, Canvas-Confetti, Web Audio API.
- **Backend Stack:** Node.js native HTTP server (`server.js`), PostgreSQL (`DATABASE_URL` via `pg`), with fallback to atomic local JSON storage (`data/boards.json` via `server/db.js`).
- **Dev Server:** Built-in Vite middleware plugin (`syncApiPlugin` in `vite.config.ts`) simulating production endpoints.

---

## 1. What AI Must NEVER Do

1. **NEVER bypass the 2-task WIP limit:**
   The WIP limit is the core cognitive guardrail of Headroom. Never permit a code change where drag-and-drop, modal creation, task editing, or remote sync pushes more than 2 tasks into the `doing` column without triggering the `WipLimitModal` guardrail.
2. **NEVER connect live timer ticks directly to cloud sync or disk writes:**
   Ticking an active stopwatch (1 second interval) must NEVER trigger debounced `POST /api/board` network requests or continuous `localStorage` writes. Ephemeral timer state must be managed cleanly without polluting the network.
3. **NEVER create Dev/Prod API divergence:**
   Whenever modifying an endpoint in `server.js`, you MUST update the corresponding handler in `vite.config.ts` (`syncApiPlugin`). Dev and Prod must behave identically.
4. **NEVER use `any` or suppress TypeScript:**
   No `any` types. No `@ts-ignore` without an explicit explanatory comment. All task, subtask, settings, and sync payloads must be strictly typed in `src/types.ts`.
5. **NEVER write unvalidated payloads to storage:**
   Never assume external JSON from `localStorage` or `/api/board` conforms to expectations. Always defensively check properties before invoking methods like `.map()`, `.filter()`, or `.trim()`.
6. **NEVER trigger Web Audio errors:**
   Browser autoplay policies suspend the `AudioContext` until user interaction. Never call sound methods without verifying audio context state and respecting user mute preferences.
7. **NEVER execute destructive git commands:**
   Never run `git push`, `git reset --hard`, `rm -rf`, or force-overwrite branches.

---

## 2. Local-First State Architecture Rules

Headroom operates under a **local-first** paradigm:

1. **Instant Offline Render:** The application must immediately load and render from `localStorage` on initial mount. Remote sync occurs asynchronously in the background.
2. **Deterministic Conflict Resolution:**
   - When pushing to `/api/board`, include `updatedAt`.
   - If the server has a higher `updatedAt`, return a `409 Conflict` containing the server board state.
   - The client must merge or prompt rather than silently overwriting concurrent remote changes.
3. **Storage Safe Fallbacks:**
   - In `src/utils/storage.ts`, wrap all `localStorage` access in `try / catch` blocks to prevent quota exceeded or privacy-mode exceptions from crashing the app.
   - If stored data is missing or corrupted, gracefully fall back to `STARTER_TASKS` or `DEFAULT_SETTINGS`.

---

## 3. Keyboard & Cognitive Ergonomics

1. **Global Shortcuts:**
   - `Ctrl+K` or `N`: Immediately opens the Brain Dump task creation modal.
   - `Escape`: Closes any open modal or cancels the current inline edit.
   - `?`: Opens the Keyboard Shortcuts cheat sheet.
2. **Focus HUD (Cockpit):**
   - The top cockpit bar must always stay pinned to the top of the viewport (`sticky top-0 z-40`).
   - It must display the single active task, active elapsed stopwatch, subtask completion count, and quick completion button.

---

## 4. Backend & Security Standards

1. **Response Shapes:**
   - All REST API endpoints must return standard JSON objects:
     - Success: `{ success: true, ...data }`
     - Failure: `{ success: false, error: "Human-readable message" }`
2. **Board Isolation & Ownership:**
   - If a board is accessed with a custom `boardKey`, ensure authenticated users cannot inadvertently or maliciously overwrite other users' private boards.
3. **Atomic File Writes on Windows:**
   - In `server/db.js`, ensure writes to `data/boards.json` do not fail silently due to Windows file-locking issues (`EPERM`/`EBUSY`).

---

## 5. Verification Protocol

Before declaring any change complete:
1. Run `npm run build` to confirm zero TypeScript compilation errors and a clean Vite production bundle.
2. Verify that existing features (HUD timer, WIP limit dialog, confetti burst, cloud sync indicator) remain functional.
3. Include the mandatory **"What happened"** session summary block at the end of your response.
