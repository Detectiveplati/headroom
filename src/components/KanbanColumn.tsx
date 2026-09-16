import React, { useState } from 'react';
import { 
  Plus, 
  Inbox, 
  Calendar, 
  Zap, 
  CheckCircle2, 
  AlertTriangle,
  Flame
} from 'lucide-react';
import { Task, Column, ColumnId } from '../types';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  activeTaskId: string | null;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, targetCol: ColumnId) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onQuickAddTask: (columnId: ColumnId, title: string) => void;
  onToggleTimer: (taskId: string) => void;
  onFocusTask: (taskId: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDropTask: (e: React.DragEvent, columnId: ColumnId) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  activeTaskId,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  onToggleSubtask,
  onQuickAddTask,
  onToggleTimer,
  onFocusTask,
  onDragStart,
  onDropTask,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const getColumnIcon = () => {
    switch (column.iconName) {
      case 'Inbox':
        return <Inbox className="w-4 h-4 text-sky-400" />;
      case 'Calendar':
        return <Calendar className="w-4 h-4 text-violet-400" />;
      case 'Zap':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'CheckCircle2':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      default:
        return <Inbox className="w-4 h-4 text-zinc-400" />;
    }
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onQuickAddTask(column.id, quickTitle.trim());
    setQuickTitle('');
    setIsAdding(false);
  };

  const isWipExceeded = column.wipLimit !== undefined && tasks.length >= column.wipLimit;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        setIsDragOver(false);
        onDropTask(e, column.id);
      }}
      className={`flex flex-col flex-1 min-w-[280px] max-w-sm rounded-2xl border transition-all duration-200 bg-white/70 dark:bg-[#0e1017]/70 backdrop-blur-sm shadow-sm dark:shadow-none ${
        isDragOver
          ? 'border-brand-500/80 bg-brand-50 dark:bg-brand-950/20 ring-2 ring-brand-500/30'
          : isWipExceeded && column.id === 'doing'
          ? 'border-amber-500/50 bg-amber-500/[0.02]'
          : 'border-zinc-200/80 dark:border-zinc-800/80'
      }`}
    >
      {/* Column Header */}
      <div className="p-3.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/40">
              {getColumnIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {column.title}
                </h3>
                <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700/40 font-medium">
                  {tasks.length}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">
                {column.subtitle}
              </p>
            </div>
          </div>

          {/* Column WIP Limit badge */}
          {column.wipLimit !== undefined && (
            <div
              className={`flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                isWipExceeded
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 animate-pulse-subtle'
                  : 'bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/50'
              }`}
              title={`WIP Limit: ${tasks.length} of ${column.wipLimit} cards.`}
            >
              {isWipExceeded ? (
                <AlertTriangle className="w-3 h-3 text-amber-500 dark:text-amber-400" />
              ) : (
                <Flame className="w-3 h-3 text-brand-500 dark:text-brand-400" />
              )}
              <span>{tasks.length}/{column.wipLimit}</span>
            </div>
          )}
        </div>
      </div>

      {/* Cards Scrollable Container */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[420px] max-h-[calc(100vh-230px)]">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isFocused={task.id === activeTaskId}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onMove={onMoveTask}
            onToggleSubtask={onToggleSubtask}
            onToggleTimer={onToggleTimer}
            onFocusTask={onFocusTask}
            onDragStart={onDragStart}
          />
        ))}

        {tasks.length === 0 && (
          <div className="h-32 border-2 border-dashed border-zinc-200 dark:border-zinc-800/60 rounded-xl flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 text-xs p-4 text-center">
            <span>No tasks in this lane</span>
            <span className="text-[11px] text-zinc-400/80 dark:text-zinc-500 mt-1">Drop a card or use quick add</span>
          </div>
        )}
      </div>

      {/* Column Footer: Inline Quick Add */}
      <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/40 rounded-b-2xl">
        {isAdding ? (
          <form onSubmit={handleQuickAddSubmit} className="space-y-2">
            <input
              type="text"
              autoFocus
              placeholder="What needs to be done? (Hit Enter)"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsAdding(false);
              }}
              className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-brand-500/60 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 px-2 py-1 rounded transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-[11px] bg-brand-600 hover:bg-brand-500 text-white font-medium px-2.5 py-1 rounded transition shadow-sm"
              >
                Add Card
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add task</span>
          </button>
        )}
      </div>
    </div>
  );
};
