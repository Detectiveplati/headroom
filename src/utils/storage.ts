import { Task, AppSettings } from '../types';

const STORAGE_KEY_TASKS = 'headroom_tasks_v1';
const STORAGE_KEY_SETTINGS = 'headroom_settings_v1';
const STORAGE_KEY_ACTIVE = 'headroom_active_task_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  wipLimit: 2,
  soundEnabled: true,
  confettiEnabled: true,
  autoStartTimerOnDoing: true,
  theme: 'system',
};

export const STARTER_TASKS: Task[] = [
  {
    id: 'starter-1',
    title: '🚀 Combat attention fragmentation with Headroom',
    description: 'Notice how the top Focus HUD always keeps your single active objective visible. Move this card around to explore your workflow!',
    columnId: 'doing',
    priority: 'urgent',
    context: 'work',
    tags: ['CoreFlow', 'Focus'],
    elapsedSeconds: 245,
    isRunning: true,
    createdAt: Date.now() - 3600000,
    subtasks: [
      { id: 'sub-1', title: 'Glance at the top Focus HUD tracking active elapsed time', completed: true },
      { id: 'sub-2', title: 'Check off this subtask right on the card', completed: false },
      { id: 'sub-3', title: 'Click "Complete" on the Focus HUD or drag to Done', completed: false },
    ],
  },
  {
    id: 'starter-2',
    title: '🧠 Test the strict 2-task WIP limit',
    description: 'Try moving this card into "In Progress" alongside starter-1. Headroom will warn you if you attempt to multitask beyond 2 items!',
    columnId: 'today',
    priority: 'high',
    context: 'work',
    tags: ['Guardrails'],
    elapsedSeconds: 0,
    isRunning: false,
    createdAt: Date.now() - 7200000,
    subtasks: [
      { id: 'sub-4', title: 'Move card to In Progress', completed: false },
      { id: 'sub-5', title: 'Attempt dragging a 3rd task into In Progress to see the WIP guard', completed: false },
    ],
  },
  {
    id: 'starter-3',
    title: '⚡ Quick brain dump incoming ideas (Ctrl+K / N)',
    description: 'Whenever a distracting thought arises, do not switch context! Press Ctrl+K or click + New Task to park it in the Brain Dump backlog.',
    columnId: 'backlog',
    priority: 'medium',
    context: 'work',
    tags: ['Workflow'],
    elapsedSeconds: 0,
    isRunning: false,
    createdAt: Date.now() - 10800000,
    subtasks: [
      { id: 'sub-6', title: 'Press Ctrl+K on your keyboard', completed: false },
      { id: 'sub-7', title: 'Capture a quick fleeting task without losing context', completed: false },
    ],
  },
  {
    id: 'starter-4',
    title: '🏠 Weekend home organization & groceries',
    description: 'Switch between "💼 Work" and "🏠 Personal" in the top bar to keep your day jobs and home life cleanly segregated!',
    columnId: 'today',
    priority: 'medium',
    context: 'personal',
    tags: ['Home', 'Personal'],
    elapsedSeconds: 0,
    isRunning: false,
    createdAt: Date.now() - 4000000,
    subtasks: [
      { id: 'sub-8', title: 'Toggle to Personal mode in Focus HUD', completed: true },
      { id: 'sub-9', title: 'Pick up weekly fresh market groceries', completed: false },
    ],
  },
  {
    id: 'starter-5',
    title: '🎉 Setup workspace and local environment',
    description: 'Example of an already finished task. Notice the celebratory completion status and logged focus time.',
    columnId: 'done',
    priority: 'low',
    context: 'work',
    tags: ['Setup'],
    elapsedSeconds: 930,
    isRunning: false,
    createdAt: Date.now() - 86400000,
    completedAt: Date.now() - 1800000,
    subtasks: [
      { id: 'sub-10', title: 'Clone repository and install dependencies', completed: true },
      { id: 'sub-11', title: 'Configure Tailwind and sound effects', completed: true },
    ],
  },
];

export function loadStoredTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS) || localStorage.getItem('focusboard_tasks_v1');
    if (!raw) {
      saveStoredTasks(STARTER_TASKS);
      return STARTER_TASKS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return STARTER_TASKS;
  } catch (e) {
    console.error('Failed to load tasks from localStorage', e);
    return STARTER_TASKS;
  }
}

export function saveStoredTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks to localStorage', e);
  }
}

export function loadStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS) || localStorage.getItem('focusboard_settings_v1');
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function loadStoredActiveTaskId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE) || localStorage.getItem('focusboard_active_task_v1');
  } catch {
    return null;
  }
}

export function saveStoredActiveTaskId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY_ACTIVE, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
    }
  } catch (e) {
    console.error('Failed to save active task ID', e);
  }
}

export function exportBoardData(tasks: Task[], settings: AppSettings): void {
  const exportPayload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    settings,
    tasks,
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `headroom-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importBoardData(jsonText: string): { tasks: Task[]; settings?: AppSettings } {
  const parsed = JSON.parse(jsonText);
  if (Array.isArray(parsed)) {
    return { tasks: parsed };
  }
  if (parsed && Array.isArray(parsed.tasks)) {
    return { tasks: parsed.tasks, settings: parsed.settings };
  }
  throw new Error('Invalid Headroom backup format. Expected array or object with tasks.');
}
