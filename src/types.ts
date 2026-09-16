export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export type ColumnId = 'backlog' | 'today' | 'doing' | 'done';

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
}

export interface AppSettings {
  wipLimit: number;
  soundEnabled: boolean;
  confettiEnabled: boolean;
  autoStartTimerOnDoing: boolean;
}
