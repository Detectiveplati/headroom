import React, { useState } from 'react';
import { 
  Plus, 
  Inbox, 
  Calendar, 
  Zap, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  Layers,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Task, Column, ColumnId, TaskColor } from '../types';
import { TASK_COLORS, TASK_COLOR_LIST } from '../utils/cardColors';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  activeTaskId: string | null;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, targetCol: ColumnId) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onUpdateColor?: (taskId: string, color: TaskColor) => void;
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
  onUpdateColor,
  onQuickAddTask,
  onToggleTimer,
  onFocusTask,
  onDragStart,
  onDropTask,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [groupByColor, setGroupByColor] = useState(true);
  const [collapsedColors, setCollapsedColors] = useState<Record<string, boolean>>({});

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
  const isDoingActive = column.id === 'doing' && tasks.length > 0;

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
      className={`flex flex-col flex-1 min-w-[280px] max-w-sm rounded-2xl border transition-all duration-300 backdrop-blur-sm ${
        isDragOver
          ? 'border-brand-500/80 bg-brand-50 dark:bg-brand-950/20 ring-2 ring-brand-500/30'
          : isDoingActive
          ? 'border-amber-400/90 dark:border-amber-500/60 bg-gradient-to-b from-amber-500/[0.10] via-amber-500/[0.04] to-offwhite-surface/95 dark:from-amber-950/30 dark:via-amber-950/15 dark:to-[#0e1017]/85 ring-2 ring-amber-400/30 dark:ring-amber-500/30 shadow-lg shadow-amber-500/10 dark:shadow-amber-500/10'
          : 'border-zinc-300/80 dark:border-zinc-800/80 bg-offwhite-surface/85 dark:bg-[#0e1017]/70 shadow-sm dark:shadow-none'
      }`}
    >
      {/* Column Header */}
      <div className={`p-3.5 border-b transition-colors duration-200 ${
        isDoingActive
          ? 'border-amber-400/60 dark:border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30'
          : 'border-zinc-300/70 dark:border-zinc-800/80'
      }`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border transition-colors ${
              isDoingActive
                ? 'bg-amber-500/25 border-amber-500/40 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'bg-offwhite-subtle dark:bg-zinc-800/60 border-zinc-300/70 dark:border-zinc-700/40'
            }`}>
              {getColumnIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-semibold tracking-tight ${
                  isDoingActive
                    ? 'text-amber-950 dark:text-amber-100 font-bold'
                    : 'text-zinc-800 dark:text-zinc-100'
                }`}>
                  {column.title}
                </h3>
                <span className={`font-mono text-xs px-2 py-0.5 rounded-full border font-medium ${
                  isDoingActive
                    ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 bg-offwhite-subtle dark:bg-zinc-800/80 border-zinc-300/70 dark:border-zinc-700/40'
                }`}>
                  {tasks.length}
                </span>

                {isDoingActive && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    IN FOCUS
                  </span>
                )}
              </div>
              <p className={`text-[11px] font-normal ${
                isDoingActive
                  ? 'text-amber-800/80 dark:text-amber-300/80'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}>
                {column.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Color Grouping Toggle */}
            {tasks.length > 0 && (
              <button
                type="button"
                onClick={() => setGroupByColor(!groupByColor)}
                className={`p-1 rounded-lg border text-xs transition ${
                  groupByColor
                    ? 'bg-brand-500/15 border-brand-500/30 text-brand-600 dark:text-brand-400'
                    : 'bg-offwhite-subtle dark:bg-zinc-800/70 border-zinc-300/70 dark:border-zinc-700/50 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
                title={groupByColor ? "Grouped by Color (Click to show flat list)" : "Flat list (Click to group by color)"}
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Column WIP Limit badge */}
            {column.wipLimit !== undefined && (
              <div
                className={`flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                  isWipExceeded
                    ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/50 animate-pulse-subtle font-semibold ring-1 ring-amber-500/30'
                    : isDoingActive
                    ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                    : 'bg-offwhite-subtle dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-400 border-zinc-300/70 dark:border-zinc-700/50'
                }`}
                title={`WIP Limit: ${tasks.length} of ${column.wipLimit} cards.`}
              >
                {isWipExceeded ? (
                  <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Flame className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                )}
                <span>{tasks.length}/{column.wipLimit}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cards Scrollable Container */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[420px] max-h-[calc(100vh-230px)]">
        {groupByColor ? (
          TASK_COLOR_LIST.map((colorKey) => {
            const colorTasks = tasks.filter((t) => (t.color || 'default') === colorKey);
            if (colorTasks.length === 0) return null;
            const cfg = TASK_COLORS[colorKey];
            const isCollapsed = Boolean(collapsedColors[colorKey]);

            return (
              <div key={colorKey} className="space-y-2">
                {/* Collapsible Color Sub-Header */}
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedColors((prev) => ({
                      ...prev,
                      [colorKey]: !prev[colorKey],
                    }))
                  }
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center justify-between transition active:scale-[0.99] cursor-pointer ${cfg.groupHeaderClass}`}
                  title={isCollapsed ? `Expand ${cfg.label} tasks` : `Collapse ${cfg.label} tasks`}
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 opacity-70 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
                    )}
                    <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotClass}`} />
                    <span className="font-semibold text-[11px]">{cfg.label}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/10">
                    {colorTasks.length}
                  </span>
                </button>

                {/* Cards in this color group */}
                {!isCollapsed && (
                  <div className="space-y-3 pl-1">
                    {colorTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isFocused={task.id === activeTaskId}
                        onEdit={onEditTask}
                        onDelete={onDeleteTask}
                        onMove={onMoveTask}
                        onToggleSubtask={onToggleSubtask}
                        onUpdateColor={onUpdateColor}
                        onToggleTimer={onToggleTimer}
                        onFocusTask={onFocusTask}
                        onDragStart={onDragStart}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isFocused={task.id === activeTaskId}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onMove={onMoveTask}
              onToggleSubtask={onToggleSubtask}
              onUpdateColor={onUpdateColor}
              onToggleTimer={onToggleTimer}
              onFocusTask={onFocusTask}
              onDragStart={onDragStart}
            />
          ))
        )}

        {tasks.length === 0 && (
          <div className={`h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-xs p-4 text-center ${
            column.id === 'doing'
              ? 'border-amber-400/40 dark:border-amber-500/30 bg-amber-500/[0.02] text-amber-700/70 dark:text-amber-400/60'
              : 'border-zinc-300/70 dark:border-zinc-800/60 text-zinc-400 dark:text-zinc-600'
          }`}>
            <span>{column.id === 'doing' ? 'Focus zone empty' : 'No tasks in this lane'}</span>
            <span className="text-[11px] opacity-80 mt-1">
              {column.id === 'doing' ? 'Drag 1-2 tasks here to start your focus engine' : 'Drop a card or use quick add'}
            </span>
          </div>
        )}
      </div>

      {/* Column Footer: Inline Quick Add */}
      <div className={`p-3 border-t rounded-b-2xl transition-colors ${
        isDoingActive
          ? 'border-amber-400/50 dark:border-amber-500/40 bg-amber-500/[0.06] dark:bg-amber-950/20'
          : 'border-zinc-300/70 dark:border-zinc-800/80 bg-offwhite-subtle/50 dark:bg-zinc-950/40'
      }`}>
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
              className="w-full text-xs bg-offwhite-card dark:bg-zinc-900 border border-zinc-300/80 dark:border-brand-500/60 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 px-2 py-1 rounded transition"
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
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg border border-dashed transition ${
              isDoingActive
                ? 'text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 hover:bg-amber-500/15 border-amber-400/60 dark:border-amber-500/40'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-offwhite-subtle dark:hover:bg-zinc-800/60 border-zinc-300/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add task</span>
          </button>
        )}
      </div>
    </div>
  );
};
