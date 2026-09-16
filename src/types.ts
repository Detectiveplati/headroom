export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export type ColumnId = 'backlog' | 'today' | 'doing' | 'done';

export type TaskContext = 'work' | 'personal';

export type ThemeMode = 'system' | 'dark' | 'light';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  columnId: ColumnId;
  priority: Priority;
  context?: TaskContext;
  subtasks: Subtask[];
  tags: string[];
  elapsedSeconds: number;
  isRunning?: boolean;
  createdAt: number;
  completedAt?: number;
  dueDate?: string;
}

export interface Column {
  id: ColumnId;
  title: string;
  subtitle: string;
  wipLimit?: number;
  badgeColor: string;
  borderColor: string;
  iconName: 'Inbox' | 'Calendar' | 'Zap' | 'CheckCircle2';
}

export interface BoardFilter {
  search: string;
  priority: Priority | 'all';
  tag: string | 'all';
  context: TaskContext | 'all';
}

export interface AppSettings {
  wipLimit: number;
  soundEnabled: boolean;
  confettiEnabled: boolean;
  autoStartTimerOnDoing: boolean;
  theme: ThemeMode;
}

export interface User {
  id: string;
  username: string;
  createdAt?: number;
}

export type ActiveTab = 'tasks' | 'expenses';

export type TransactionType = 'expense' | 'refund' | 'transfer' | 'income';

export type ExpenseCategory =
  | 'Food & Dining'
  | 'Groceries'
  | 'Transport & Petrol'
  | 'Shopping & E-Commerce'
  | 'Entertainment & Gaming'
  | 'Personal Care & Services'
  | 'Bills & Utilities'
  | 'Transfer / Payment'
  | 'Uncategorized';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD or raw date
  postingDate?: string;
  rawDescription: string;
  cleanMerchant: string;
  amount: number;
  type: TransactionType;
  category: ExpenseCategory;
  paymentType?: string;
  accountName?: string;
  reviewed: boolean;
  createdAt: number;
}

export interface CategoryBudget {
  category: ExpenseCategory;
  monthlyLimit: number;
}

export interface CardMetaInfo {
  accountName?: string;
  statementDate?: string;
  creditLimit?: number;
  availableLimit?: number;
}
