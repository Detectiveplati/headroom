import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Task, Column, ColumnId, Priority, BoardFilter, AppSettings } from '../types';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  tasks: Task[];
  activeTaskId: string | null;
  settings: AppSettings;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, targetCol: ColumnId) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onQuickAddTask: (columnId: ColumnId, title: string) => void;
  onToggleTimer: (taskId: string) => void;
  onFocusTask: (taskId: string) => void;
  onWipViolation: (task: Task) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  activeTaskId,
  settings,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  onToggleSubtask,
  onQuickAddTask,
  onToggleTimer,
  onFocusTask,
  onWipViolation,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<BoardFilter>({
    search: '',
    priority: 'all',
    tag: 'all',
  });

  const columns: Column[] = [
    {
      id: 'backlog',
      title: 'Brain Dump',
      subtitle: 'Unfiltered ideas & backlog',
      badgeColor: 'sky',
      borderColor: 'border-sky-500/20',
      iconName: 'Inbox',
    },
    {
      id: 'today',
      title: 'To Do Today',
      subtitle: 'Committed focus items',
      badgeColor: 'violet',
      borderColor: 'border-violet-500/20',
      iconName: 'Calendar',
    },
    {
      id: 'doing',
      title: 'In Progress',
      subtitle: `Max ${settings.wipLimit} concurrent tasks`,
      wipLimit: settings.wipLimit,
      badgeColor: 'amber',
      borderColor: 'border-amber-500/20',
      iconName: 'Zap',
    },
    {
      id: 'done',
      title: 'Done',
      subtitle: 'Shipped & celebrated',
      badgeColor: 'emerald',
      borderColor: 'border-emerald-500/20',
      iconName: 'CheckCircle2',
    },
  ];

  // Collect all unique tags for filter
  const allTags = Array.from(new Set(tasks.flatMap((t) => t.tags || [])));

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Search query
    if (filter.search.trim()) {
      const q = filter.search.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q) || false;
      const matchTag = task.tags?.some((t) => t.toLowerCase().includes(q)) || false;
      if (!matchTitle && !matchDesc && !matchTag) return false;
    }

    // Priority filter
    if (filter.priority !== 'all' && task.priority !== filter.priority) {
      return false;
    }

    // Tag filter
    if (filter.tag !== 'all' && (!task.tags || !task.tags.includes(filter.tag))) {
      return false;
    }

    return true;
  });

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDropTask = (e: React.DragEvent, targetCol: ColumnId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.columnId === targetCol) return;

    // Strict WIP Check when moving to 'doing'
    if (targetCol === 'doing') {
      const currentDoingCount = tasks.filter((t) => t.columnId === 'doing').length;
      if (currentDoingCount >= settings.wipLimit) {
        // Trigger WIP Guardrail!
        onWipViolation(task);
        setDraggedTaskId(null);
        return;
      }
    }

    onMoveTask(taskId, targetCol);
    setDraggedTaskId(null);
  };

  const isFiltered = filter.search !== '' || filter.priority !== 'all' || filter.tag !== 'all';

  return (
    <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/40 p-2.5 rounded-2xl border border-zinc-800/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter tasks by name, notes, or tags..."
              value={filter.search}
              onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {filter.search && (
              <button
                onClick={() => setFilter((f) => ({ ...f, search: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Priority Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          <span className="text-[11px] text-zinc-500 mr-1 hidden sm:inline">Priority:</span>
          {(['all', 'urgent', 'high', 'medium', 'low'] as (Priority | 'all')[]).map((p) => (
            <button
              key={p}
              onClick={() => setFilter((f) => ({ ...f, priority: p }))}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono capitalize transition ${
                filter.priority === p
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Tags filter if any exist */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5">
            <select
              value={filter.tag}
              onChange={(e) => setFilter((f) => ({ ...f, tag: e.target.value }))}
              className="text-xs bg-zinc-950/60 border border-zinc-800/80 rounded-lg px-2.5 py-1 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="all">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          </div>
        )}

        {isFiltered && (
          <button
            onClick={() => setFilter({ search: '', priority: 'all', tag: 'all' })}
            className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1 ml-auto"
          >
            <X className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* 4 Flow Columns Kanban Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start overflow-x-auto pb-6">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={filteredTasks.filter((t) => t.columnId === col.id)}
            activeTaskId={activeTaskId}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onMoveTask={(taskId, targetCol) => {
              // Direct move check
              if (targetCol === 'doing') {
                const currentDoingCount = tasks.filter((t) => t.columnId === 'doing').length;
                if (currentDoingCount >= settings.wipLimit) {
                  const task = tasks.find((t) => t.id === taskId);
                  if (task) {
                    onWipViolation(task);
                    return;
                  }
                }
              }
              onMoveTask(taskId, targetCol);
            }}
            onToggleSubtask={onToggleSubtask}
            onQuickAddTask={onQuickAddTask}
            onToggleTimer={onToggleTimer}
            onFocusTask={onFocusTask}
            onDragStart={handleDragStart}
            onDropTask={handleDropTask}
          />
        ))}
      </div>
    </div>
  );
};
