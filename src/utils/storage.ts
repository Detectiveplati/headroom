import { 
  Task, 
  AppSettings, 
  Transaction, 
  CategoryBudget, 
  ExpenseCategory, 
  CardMetaInfo,
  TrackedAccount,
  MonthlyAccountUpload,
  Project
} from '../types';

const STORAGE_KEY_TASKS = 'headroom_tasks_v1';
const STORAGE_KEY_SETTINGS = 'headroom_settings_v1';
const STORAGE_KEY_ACTIVE = 'headroom_active_task_v1';
const STORAGE_KEY_EXPENSES = 'headroom_expenses_v1';
const STORAGE_KEY_BUDGETS = 'headroom_budgets_v1';
const STORAGE_KEY_RULES = 'headroom_category_rules_v1';
const STORAGE_KEY_CARD_META = 'headroom_card_meta_v1';
const STORAGE_KEY_ACCOUNTS = 'headroom_tracked_accounts_v1';
const STORAGE_KEY_UPLOAD_LOGS = 'headroom_monthly_upload_logs_v1';
const STORAGE_KEY_PROJECTS = 'headroom_projects_v1';
const STORAGE_KEY_SCRUBBED = 'headroom_sample_scrubbed_v1';
const STORAGE_KEY_FINANCE_MIGRATED = 'headroom_finance_storage_scoped_v1';

export const DEFAULT_BUDGETS: CategoryBudget[] = [
  { category: 'Food & Dining', monthlyLimit: 700 },
  { category: 'Groceries', monthlyLimit: 300 },
  { category: 'Transport & Petrol', monthlyLimit: 350 },
  { category: 'Shopping & E-Commerce', monthlyLimit: 500 },
  { category: 'Entertainment & Gaming', monthlyLimit: 150 },
  { category: 'Personal Care & Services', monthlyLimit: 150 },
  { category: 'Bills & Utilities', monthlyLimit: 200 },
];

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
    color: 'emerald',
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
    color: 'amber',
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
    color: 'blue',
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
    color: 'pink',
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

// -------------------------------------------------------------
// Expense & Budget Local-First Storage
// -------------------------------------------------------------

function getUserFinanceKey(baseKey: string, userId: string): string {
  return `${baseKey}:${userId}`;
}

function purgeLegacyUnscopedFinanceData(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY_FINANCE_MIGRATED) !== 'true') {
      // These unscoped keys were shared by every signed-in user and may contain demo data.
      localStorage.removeItem(STORAGE_KEY_EXPENSES);
      localStorage.removeItem(STORAGE_KEY_CARD_META);
      localStorage.removeItem(STORAGE_KEY_BUDGETS);
      localStorage.removeItem(STORAGE_KEY_RULES);
      localStorage.removeItem(STORAGE_KEY_ACCOUNTS);
      localStorage.removeItem(STORAGE_KEY_UPLOAD_LOGS);
      localStorage.removeItem(STORAGE_KEY_SCRUBBED);
      localStorage.setItem(STORAGE_KEY_FINANCE_MIGRATED, 'true');
    }
  } catch {
    // Graceful fallback for privacy mode / restricted storage
  }
}

export function loadStoredTransactions(userId: string): Transaction[] {
  try {
    purgeLegacyUnscopedFinanceData();
    const raw = localStorage.getItem(getUserFinanceKey(STORAGE_KEY_EXPENSES, userId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Failed to load transactions from localStorage', e);
    return [];
  }
}

export function saveStoredTransactions(userId: string, transactions: Transaction[]): void {
  try {
    localStorage.setItem(getUserFinanceKey(STORAGE_KEY_EXPENSES, userId), JSON.stringify(transactions));
  } catch (e) {
    console.error('Failed to save transactions to localStorage', e);
  }
}

export function clearAllExpenseData(userId: string): void {
  try {
    localStorage.removeItem(getUserFinanceKey(STORAGE_KEY_EXPENSES, userId));
    localStorage.removeItem(getUserFinanceKey(STORAGE_KEY_CARD_META, userId));
  } catch (e) {
    console.error('Failed to clear expense data', e);
  }
}

export function loadStoredBudgets(userId: string): CategoryBudget[] {
  try {
    purgeLegacyUnscopedFinanceData();
    const raw = localStorage.getItem(getUserFinanceKey(STORAGE_KEY_BUDGETS, userId));
    if (!raw) return DEFAULT_BUDGETS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_BUDGETS;
  } catch (e) {
    return DEFAULT_BUDGETS;
  }
}

export function saveStoredBudgets(userId: string, budgets: CategoryBudget[]): void {
  try {
    localStorage.setItem(getUserFinanceKey(STORAGE_KEY_BUDGETS, userId), JSON.stringify(budgets));
  } catch (e) {
    console.error('Failed to save budgets to localStorage', e);
  }
}

export function loadStoredCategoryRules(userId: string): Record<string, ExpenseCategory> {
  try {
    purgeLegacyUnscopedFinanceData();
    const raw = localStorage.getItem(getUserFinanceKey(STORAGE_KEY_RULES, userId));
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (e) {
    return {};
  }
}

export function saveStoredCategoryRules(userId: string, rules: Record<string, ExpenseCategory>): void {
  try {
    localStorage.setItem(getUserFinanceKey(STORAGE_KEY_RULES, userId), JSON.stringify(rules));
  } catch (e) {
    console.error('Failed to save category rules to localStorage', e);
  }
}

export function loadStoredCardMeta(userId: string): CardMetaInfo {
  try {
    purgeLegacyUnscopedFinanceData();
    const raw = localStorage.getItem(getUserFinanceKey(STORAGE_KEY_CARD_META, userId));
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) || {};
  } catch (e) {
    return {};
  }
}

export function saveStoredCardMeta(userId: string, meta: CardMetaInfo): void {
  try {
    localStorage.setItem(getUserFinanceKey(STORAGE_KEY_CARD_META, userId), JSON.stringify(meta));
  } catch (e) {
    console.error('Failed to save card metadata', e);
  }
}

export const DEFAULT_ACCOUNTS: TrackedAccount[] = [];

const LEGACY_SAMPLE_ACCOUNT_IDS = new Set([
  'acc_dbs_multiplier',
  'acc_ocbc_360',
  'acc_credit_card',
]);

export function loadStoredAccounts(userId?: string): TrackedAccount[] {
  try {
    purgeLegacyUnscopedFinanceData();
    const key = userId ? getUserFinanceKey(STORAGE_KEY_ACCOUNTS, userId) : STORAGE_KEY_ACCOUNTS;
    const raw = localStorage.getItem(key);
    if (!raw) {
      return DEFAULT_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Remove the former zero-balance sample banks, but retain an account that was
      // genuinely used for reconciliation or given a balance by the user.
      return parsed.filter((account): account is TrackedAccount =>
        account && typeof account === 'object' &&
        (!LEGACY_SAMPLE_ACCOUNT_IDS.has(account.id) ||
          Number(account.currentBalance) !== 0 ||
          Boolean(account.lastReconciledMonth))
      );
    }
    return DEFAULT_ACCOUNTS;
  } catch (e) {
    console.error('Failed to load accounts from localStorage', e);
    return DEFAULT_ACCOUNTS;
  }
}

export function saveStoredAccounts(userId: string | undefined, accounts: TrackedAccount[]): void {
  try {
    const key = userId ? getUserFinanceKey(STORAGE_KEY_ACCOUNTS, userId) : STORAGE_KEY_ACCOUNTS;
    localStorage.setItem(key, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save accounts to localStorage', e);
  }
}

export function loadStoredUploadLogs(userId?: string): MonthlyAccountUpload[] {
  try {
    purgeLegacyUnscopedFinanceData();
    const key = userId ? getUserFinanceKey(STORAGE_KEY_UPLOAD_LOGS, userId) : STORAGE_KEY_UPLOAD_LOGS;
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Failed to load upload logs from localStorage', e);
    return [];
  }
}

export function saveStoredUploadLogs(userId: string | undefined, logs: MonthlyAccountUpload[]): void {
  try {
    const key = userId ? getUserFinanceKey(STORAGE_KEY_UPLOAD_LOGS, userId) : STORAGE_KEY_UPLOAD_LOGS;
    localStorage.setItem(key, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save upload logs to localStorage', e);
  }
}

export const STARTER_PROJECTS: Project[] = [
  {
    id: 'proj-chillios',
    name: 'chillios',
    description: 'Core chillios application suite and modular client architecture',
    color: '#6366f1',
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now(),
    modules: [
      {
        id: 'mod-retention',
        projectId: 'proj-chillios',
        name: 'Retention Sample Module',
        summary: 'User cohort retention tracking, mathematical curve modeling, and sample analytics pipeline.',
        status: 'in-progress',
        version: 'v0.8.2',
        techStack: ['Swift', 'TypeScript', 'Analytics Engine'],
        updatedAt: Date.now() - 3600000 * 2,
        notes: 'Targeting 90-day retention baseline. Needs QA on edge cases where sample size is under 10 cohorts.',
        doneItems: [
          {
            id: 'scope-1',
            title: 'Cohort retention calculation engine with day-N intervals',
            completed: true,
            createdAt: Date.now() - 86400000 * 3,
            completedAt: Date.now() - 86400000 * 2,
          },
          {
            id: 'scope-2',
            title: 'Synthetic sample event generator for offline development & mocking',
            completed: true,
            createdAt: Date.now() - 86400000 * 3,
            completedAt: Date.now() - 86400000 * 1,
          },
          {
            id: 'scope-3',
            title: 'Visual retention curve rendering layout with smooth gradients',
            completed: true,
            createdAt: Date.now() - 86400000 * 2,
            completedAt: Date.now() - 86400000 * 1,
          },
        ],
        missingItems: [
          {
            id: 'scope-4',
            title: 'Cohort segment filtering dropdown UI (organic vs paid channels)',
            completed: false,
            createdAt: Date.now() - 86400000 * 1,
          },
          {
            id: 'scope-5',
            title: 'CSV raw retention cohort data export format',
            completed: false,
            createdAt: Date.now() - 86400000 * 1,
          },
          {
            id: 'scope-6',
            title: 'Unit tests for 90-day rolling boundary conditions',
            completed: false,
            createdAt: Date.now() - 3600000 * 4,
          },
          {
            id: 'scope-7',
            title: 'Graceful empty state banner when cohort sample size < 10 users',
            completed: false,
            createdAt: Date.now() - 3600000 * 2,
          },
        ],
      },
      {
        id: 'mod-auth',
        projectId: 'proj-chillios',
        name: 'Authentication & Session Module',
        summary: 'Biometric passkey onboarding flows with secure keychain persistence.',
        status: 'shipped',
        version: 'v1.0.0',
        techStack: ['Passkeys', 'Keychain', 'Biometrics'],
        updatedAt: Date.now() - 86400000 * 5,
        doneItems: [
          {
            id: 'scope-auth-1',
            title: 'FaceID / TouchID biometric prompt fallback',
            completed: true,
            createdAt: Date.now() - 86400000 * 8,
            completedAt: Date.now() - 86400000 * 5,
          },
          {
            id: 'scope-auth-2',
            title: 'Encrypted token refresh in background tasks',
            completed: true,
            createdAt: Date.now() - 86400000 * 7,
            completedAt: Date.now() - 86400000 * 5,
          },
        ],
        missingItems: [
          {
            id: 'scope-auth-3',
            title: 'Multi-device active session revocation panel',
            completed: false,
            createdAt: Date.now() - 86400000 * 4,
          },
        ],
      },
      {
        id: 'mod-notifications',
        projectId: 'proj-chillios',
        name: 'Smart Notifications Engine',
        summary: 'Local contextual nudges and re-engagement trigger alerts.',
        status: 'planning',
        version: 'v0.3.0',
        techStack: ['APNs', 'LocalNotifications'],
        updatedAt: Date.now() - 86400000 * 1,
        doneItems: [
          {
            id: 'scope-notif-1',
            title: 'Permission request prompt ergonomics with explainers',
            completed: true,
            createdAt: Date.now() - 86400000 * 2,
            completedAt: Date.now() - 86400000 * 1,
          },
        ],
        missingItems: [
          {
            id: 'scope-notif-2',
            title: 'Dynamic interval calculation based on user drop-off days',
            completed: false,
            createdAt: Date.now() - 86400000 * 1,
          },
          {
            id: 'scope-notif-3',
            title: 'Deep-linking router handler on nudge notification tap',
            completed: false,
            createdAt: Date.now() - 3600000 * 6,
          },
        ],
      },
    ],
  },
];

export function loadStoredProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (!raw) {
      return STARTER_PROJECTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return STARTER_PROJECTS;
    }
    // Defensively sanitize properties
    return parsed.map((p) => ({
      id: String(p?.id || `proj-${Date.now()}`),
      name: String(p?.name || 'Untitled Project'),
      description: String(p?.description || ''),
      color: String(p?.color || '#6366f1'),
      createdAt: Number(p?.createdAt) || Date.now(),
      updatedAt: Number(p?.updatedAt) || Date.now(),
      modules: Array.isArray(p?.modules)
        ? p.modules.map((m: any) => ({
            id: String(m?.id || `mod-${Date.now()}`),
            projectId: String(m?.projectId || p?.id),
            name: String(m?.name || 'Untitled Module'),
            summary: String(m?.summary || ''),
            status: ['planning', 'in-progress', 'review', 'shipped'].includes(m?.status)
              ? m.status
              : 'planning',
            version: m?.version ? String(m.version) : undefined,
            techStack: Array.isArray(m?.techStack) ? m.techStack.map(String) : [],
            notes: m?.notes ? String(m.notes) : undefined,
            updatedAt: Number(m?.updatedAt) || Date.now(),
            doneItems: Array.isArray(m?.doneItems)
              ? m.doneItems.map((item: any) => ({
                  id: String(item?.id || `scope-${Date.now()}`),
                  title: String(item?.title || ''),
                  details: item?.details ? String(item.details) : undefined,
                  completed: true,
                  linkedTaskId: item?.linkedTaskId ? String(item.linkedTaskId) : undefined,
                  createdAt: Number(item?.createdAt) || Date.now(),
                  completedAt: Number(item?.completedAt) || Date.now(),
                }))
              : [],
            missingItems: Array.isArray(m?.missingItems)
              ? m.missingItems.map((item: any) => ({
                  id: String(item?.id || `scope-${Date.now()}`),
                  title: String(item?.title || ''),
                  details: item?.details ? String(item.details) : undefined,
                  completed: false,
                  linkedTaskId: item?.linkedTaskId ? String(item.linkedTaskId) : undefined,
                  createdAt: Number(item?.createdAt) || Date.now(),
                }))
              : [],
          }))
        : [],
    }));
  } catch (e) {
    console.error('Failed to load projects from localStorage, falling back to starter projects', e);
    return STARTER_PROJECTS;
  }
}

export function saveStoredProjects(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects to localStorage', e);
  }
}

