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
  birthday?: string;
  createdAt?: number;
}

export type ActiveTab = 'tasks' | 'expenses';

export type TransactionType = 'expense' | 'refund' | 'transfer' | 'income';

export type OfficeClaimReimbursementMethod = 'pending' | 'account' | 'cash';

export type ExpenseCategory =
  | 'Salary & Income'
  | 'Money In'
  | 'Office Claims'
  | 'Food & Dining'
  | 'Groceries'
  | 'Transport & Petrol'
  | 'Shopping & E-Commerce'
  | 'Subscriptions'
  | 'Entertainment & Gaming'
  | 'Personal Care & Services'
  | 'Bills & Utilities'
  | 'Transfer / Payment'
  | 'PayNow Transfers'
  | 'Uncategorized';

export type AccountType = 'debit' | 'credit' | 'cash';

export interface TrackedAccount {
  id: string;
  name: string;
  institution?: string;
  accountNumberMask?: string;
  type: AccountType;
  color: string;
  currentBalance: number;
  lastReconciledMonth?: string; // e.g. '2026-03'
  createdAt: number;
}

export interface MonthlyAccountUpload {
  id: string;
  accountId: string;
  month: string; // 'YYYY-MM'
  uploadedAt: number;
  fileName: string;
  statementPeriod?: string;
  startingBalance?: number;
  closingBalance?: number;
  transactionCount: number;
}

export interface Transaction {
  id: string;
  accountId?: string;
  accountName?: string;
  date: string; // YYYY-MM-DD or raw date
  postingDate?: string;
  rawDescription: string;
  cleanMerchant: string;
  amount: number;
  type: TransactionType;
  category: ExpenseCategory;
  paymentType?: string;
  reimbursementMethod?: OfficeClaimReimbursementMethod;
  balanceAfterTx?: number;
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
  statementPeriod?: string;
  creditLimit?: number;
  availableLimit?: number;
  openingBalance?: number;
  closingBalance?: number;
  accountType?: AccountType;
}

export interface CategorizeRequest {
  rawDescription: string;
  amount?: number;
  type?: TransactionType;
}

// Kept as an alias for callers that adopted the earlier name.
export type CategorizeItemRequest = CategorizeRequest;

export interface CategorizedRuleResult {
  rawDescription: string;
  cleanMerchant: string;
  category: ExpenseCategory;
  suggestedRegex: string;
  type: TransactionType;
}
