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

## 6. Model Tiers, Task Classification & Mandatory Delegation

### Model tiers (version-free, all AI tools)

Rules name **capability tiers**, never specific models. Each tool maps a tier to its own model family, so a new model release needs no change to any repo file.

| Tier | Job | Claude Code | Codex | Antigravity | Other tools (Copilot, Cursor…) |
|---|---|---|---|---|---|
| **deep** | Plan, design and decide on complex or risky work; unclear root causes; security and data-integrity reasoning; review risky changes. Orchestrates when the main session runs on it | `opus` | inherit model, `model_reasoning_effort = "high"` | `pro` | strongest model offered |
| **standard** | Hands-on: implement, fix bugs, UI work, code review | `sonnet` | inherit model, `"medium"` | `inherit` | default model |
| **fast** | High-volume, well-defined: search, gather docs, build/typecheck, checklists, sweeps | `haiku` | inherit model, `"low"` | `flash` | fastest/cheapest model |

1. **No version-specific model ids** (`claude-…-4-5`, `gpt-…`, `gemini-…-pro-…`) in any committed instruction, agent file or config. Use the family alias above; exact ids live only in the user's own tool settings.
2. **The main session orchestrates, on whichever tier it runs.** Pick its model by task: standard (`sonnet`) for day-to-day work (categories A, B, F); deep (`opus`, or Claude Code's `opusplan`) for high-risk, architectural or unclear-cause work (C, D, E). A standard-tier main session sends deep-tier jobs (design decisions, root causes, review of risky changes) to a deep-tier agent instead of making those calls itself; in Claude Code, pass `model: opus` on that agent call. A deep-tier main session does not do hands-on work above category A: it hands edits to standard-tier agents and reviews them. A standard-tier main session may make those edits itself, since delegating to its own tier only adds overhead. Either way, searches, builds and sweeps go to fast-tier agents. Only the main session delegates; subagents never spawn subagents.
3. **Hand work to the lowest tier that can do it reliably.** Fast gathers, deep judges: never act on a fast-tier conclusion without review.
4. **Escalate one tier for one call** when a job proves harder than expected, instead of a third retry on the same tier. A subagent never escalates itself.
5. **Tool can't run subagents or pick models?** Still run the phases in order (gather → implement → verify → review) in one session, and name the tier each phase would have used.
6. When a vendor renames or adds a tier, update this table only.

Agent definitions exist per tool: `.claude/agents/*.md` (canonical instructions), `.codex/agents/*.toml` and `.agents/agents/*.md` (Antigravity). The Codex and Antigravity files are thin pointers to the canonical `.claude/agents/` file, so each agent's instructions live in one place.

### Task classification

The main session (standard or deep tier, see rule 2) classifies, plans, splits the work, reviews every result and makes every decision. On the deep tier it does **not** do the hands-on work above category A; that goes to the standard- and fast-tier agents. On the standard tier it may implement directly, and the routing below that names `implementer` / `bug-fixer` / `uiux-engineer` becomes optional; `qa-test-agent`, `code-reviewer` and deep-tier review steps stay mandatory. Background (retry limits, context budget) is in [.claude/README.md](.claude/README.md).

| Category | Description | Example | Mandatory Routing |
|---|---|---|---|
| **A — Trivial** | Copy change, CSS nit, single-file typo | Update keyboard cheat sheet text | Main session edits directly. No agents. |
| **B — Scoped Implementation** | Target files identified, clear requirements | Add a priority filter option in `FocusHUD.tsx` | `implementer` → `qa-test-agent`. |
| **C — Investigation Required** | Bug with unknown cause or state desync | "Why does timer pause when switching tabs?" | `Explore` → `bug-fixer` → `qa-test-agent`. |
| **D — High-Risk State/Sync** | LocalStorage, sync protocol, WIP limit invariants | Changes to `src/utils/sync.ts` or `server/db.js` | `implementer` → `qa-test-agent` → `code-reviewer`. |
| **E — Architectural Change** | New data model, offline sync redesign, auth system | Introducing IndexedDB or CRDT sync | `researcher` (if needed) → orchestrator writes plan → **user approval** → `implementer` → `qa-test-agent` → `code-reviewer` → `code-auditor`. |
| **F — UI/UX Ergonomics** | Focus HUD layout, keyboard interactions, sound effects | Adding audio feedback for subtask completion | `uiux-engineer` → `qa-test-agent` → optional `code-reviewer`. |

### Delegation rules for the main session (hard rules, not suggestions)

1. **State the category first.** Before the first edit of a task, say in one line which category it is and which agents it routes to.
2. **No direct code edits above category A when the main session is deep tier.** For B–F, a deep-tier main session must not `Edit`/`Write` files under `src/`, `server/`, `server.js` or `vite.config.ts` itself. Hand the edits to the routed agent with file paths, line ranges and the exact change wanted. "It's quicker to do it myself" is not a reason to skip delegation.
3. **Allowed direct edits:** category A changes; a one- or two-line correction to an agent's output caught during review; docs and config (`*.md`, `.claude/`). Anything bigger goes back to the agent.
4. **Builds and checks go to the fast tier.** `npm run build`, typechecks and pre-commit sweeps run through `qa-test-agent` / `code-auditor`, not the main session. The main session reads their report and decides.
5. **Lookups go to the fast tier.** Multi-file searches go to `Explore`; outside facts (docs, library options, browser behaviour) go to `researcher`. The main session still reads single known files itself.
6. **Browser verification stays with the main session.** Subagents cannot see the preview pane, so the orchestrator does the in-browser check after the agents finish.
7. **Batch UI iterations.** When the user iterates on a UI in rounds, gather each round's changes into one `uiux-engineer` / `implementer` call rather than making them one at a time.
8. **Parallelise independent jobs** by launching their agents in a single message.

---

## 7. Verification Protocol & Session Summary

Before presenting any changes as complete:
1. **Self-Review:** Check for unused imports, ensure event listeners (`keydown`, `visibilitychange`) have cleanup return functions in `useEffect`.
2. **Build Check:** Have `qa-test-agent` run `npm run build` (category A: the main session may run it directly) to confirm zero TypeScript compilation errors and a clean Vite production bundle.
3. **Functional Verification:** Verify that existing core features (HUD timer, WIP limit dialog, confetti burst, cloud sync indicator) remain functional.
4. **Session Summary (Mandatory):** Conclude your response with the plain-language summary block:

```markdown
---
### ✅ What happened
- [One sentence describing the main change]
- [Notable details or edge cases handled]
- [Agents used: which agent did which part, or "none (category A)"]
- [Build status: verified via npm run build]
```
