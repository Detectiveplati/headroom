# Headroom 🧠

> **An interactive, high-clarity Kanban board designed specifically to combat task forgetfulness, context-switching fatigue, and attention fragmentation.**

---

## ⚡ Why Headroom?

Most productivity boards (Trello, Jira, Notion) encourage accumulating endless backlogs and half-finished cards across columns. This creates **attention fragmentation** and **task amnesia**—the constant feeling of *"Wait, what was I doing again?"*

**Headroom** is built around deliberate constraints and cognitive ergonomics:

1. **Persistent Focus HUD**: A sticky cockpit bar always visible at the top showing the exact task you are executing right now, complete with an active elapsed timer, subtask progress, and one-click completion.
2. **Strict 2-Task WIP Limit**: Hard cognitive guardrail preventing you from having more than 2 items in "In Progress" at the same time. If you try to drag a 3rd task into Doing, Headroom intercepts with a focus guardrail dialog to keep you single-threaded.
3. **Brain Dump Buffer**: Fleeting thoughts and distractors can be parked instantly into the Backlog via `Ctrl+K` without derailing your active flow state.
4. **Micro-Checklists**: Intimidating tasks can be broken down into concrete subtasks with interactive checkboxes right on the card face.
5. **Sensory Feedback**: Celebratory confetti bursts and synthesized Web Audio API chimes upon shipping tasks.
6. **Zero Cloud Lock-in**: Full LocalStorage automatic synchronization with instant JSON backup export and import.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- `npm`

### Installation & Launch

```bash
# Navigate to project directory
cd D:/Coding/headroom

# Install dependencies
npm install

# Start local dev server
npm run dev
```

Open your browser to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + K` or `N` | Quick capture new task directly into Brain Dump |
| `Escape` | Close any active modal or cancel input |
| `?` | Open Help & Shortcuts cheat sheet |

---

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript
- **Bundler**: Vite 6
- **Styling**: Tailwind CSS (Linear/Raycast dark theme)
- **Icons**: Lucide React
- **Celebration**: Canvas-Confetti + Web Audio API synthesizer
- **Storage**: LocalStorage with schema versioning + JSON export/import

---

## 📦 Scripts

- `npm run dev`: Launch local Vite dev server on port 3000
- `npm run build`: Type-check with `tsc` and produce an optimized production bundle in `/dist`
- `npm run preview`: Preview the production build locally
