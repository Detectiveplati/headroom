# Project Map module

A freeform whiteboard per project. Modules are boxes; the tasks inside them are the same
cards that appear on the kanban board. This replaces the old "done / missing scope" Projects tab.

## Decisions (by Zack)

| # | Decision |
|---|---|
| Shape | Freeform whiteboard. Nothing is locked or forced. |
| Links | Freeform lines. A "blocks" line is only a visual flag; the app never enforces it. |
| Done | Checkbox only. A module is done when all its tasks are ticked, or ticked by hand if it has no tasks. |
| Depth | 2 levels: the overview canvas, and the inside of one module (tasks, notes, later its own mini-canvas). |
| Kanban | The map creates the cards. Project cards live on the same board, carry a project highlight, and share one done state with the map. |
| Layout | Snap to a 24px grid by default; Alt while dragging places freely. |
| Scale | ~15 modules × 5–10 tasks (~150 tasks per project). |
| Mobile | Yes, as the at-a-glance view. |
| Seed | ChilliOS (`chillios-seed.json`, imported from the Projects tab). |
| Storage | Stay on the existing per-user board blob (not SQL tables). |

## How it fits Headroom

- **A task is a card.** Module tasks are `Task`s with `linkedProjectId` + `linkedModuleId` (the node id).
  There is no second copy to sync.
- **Done is the Done column.** Ticking on the map sets `columnId: 'done'`; unticking moves it to `backlog`.
  Completing on the board ticks it on the map, because it is the same card.
- **`isOnBoard`.** `false` = map only (the default for map tasks); missing/`true` = on the board.
  Taking a card off the board parks it in the backlog, so the map never hides a card in Doing (WIP limit).
- **Progress is computed**, never stored: module = done ÷ total tasks; project = done ÷ total modules.
- **Data:** `Project { nodes: MapNode[]; links: MapLink[] }` in `src/types.ts`, saved in the board blob
  (`boards.projects` column). `normalizeProjects()` in `src/utils/projectMap.ts` validates it and migrates
  old projects (`modules` with `doneItems` / `missingItems`) into nodes and cards with deterministic ids.
- **Import** (`importMapFile`) is safe to run twice: the project is matched by name, boxes by seed key,
  tasks by title within their module.

## Phases

| Phase | Outcome | Status |
|---|---|---|
| 0 | Repo check, plan adjusted | Done |
| 0.5 | Persist projects on the server (they were dropped by `saveBoard`) | Done |
| 1 | Overview canvas: add, drag and snap modules, tick them, draw lines, save positions | Done |
| 2 | Module panel: tasks as cards, notes, computed progress, automatic module tick | Done (no task reordering yet) |
| 3 | Kanban link: `isOnBoard`, project colour + chip, board filter, "Open in map", shared done | Done |
| 4 | ChilliOS seed import | Done (Import button on the Projects tab) |
| 5 | Polish: alignment guides, tidy selection | Todo. Frames (drag moves contents), stickies and line styles are done |
| 6 | Inner canvas (level 2) for big modules | Todo |
| 7 | Phone list view and a touch pass | Todo |

## Open questions (not blocking)

- Should an archived or finished project stay in the board filter?
- Should the ChilliOS map later update itself from the ChilliOS repo?
- A shortcut for "send all of this week's tasks to the board"?
