import React, { useState } from 'react';
import { 
  Clock, 
  CheckSquare, 
  ChevronRight, 
  ChevronLeft, 
  Trash2, 
  Edit3, 
  Play, 
  Pause, 
  Tag, 
  ChevronDown, 
  ChevronUp, 
  GripVertical,
  CheckCircle2,
  Calendar,
  Briefcase,
  Home,
  Zap
} from 'lucide-react';
import { Task, ColumnId } from '../types';

interface TaskCardProps {
  task: Task;
  isFocused: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onMove: (taskId: string, targetCol: ColumnId) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onToggleTimer?: (taskId: string) => void;
  onFocusTask?: (taskId: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
}

const COLUMN_ORDER: ColumnId[] = ['backlog', 'today', 'doing', 'done'];

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isFocused,
  onEdit,
  onDelete,
  onMove,
  onToggleSubtask,
  onToggleTimer,
  onFocusTask,
  onDragStart,
}) => {
  const [showSubtasks, setShowSubtasks] = useState(false);

  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = task.subtasks.length;
  const progressPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const currentIdx = COLUMN_ORDER.indexOf(task.columnId);
  const prevCol = currentIdx > 0 ? COLUMN_ORDER[currentIdx - 1] : null;
  const nextCol = currentIdx < COLUMN_ORDER.length - 1 ? COLUMN_ORDER[currentIdx + 1] : null;

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
      case 'high':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'medium':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      default:
        return 'bg-offwhite-subtle dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300/70 dark:border-zinc-700/50';
    }
  };

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  const isDoingTask = task.columnId === 'doing';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className={`group relative rounded-xl transition-all duration-200 cursor-grab active:cursor-grabbing border select-none ${
        isFocused
          ? 'bg-offwhite-card dark:bg-zinc-900/95 border-brand-500/70 shadow-md shadow-brand-500/15 ring-1 ring-brand-500/40' + (isDoingTask ? ' border-l-4 border-l-amber-500' : '')
          : isDoingTask
          ? 'bg-[#fffefb] dark:bg-[#181520] border-amber-400/80 dark:border-amber-500/50 border-l-4 border-l-amber-500 hover:border-amber-500 dark:hover:border-amber-400 shadow-md shadow-amber-500/10 hover:shadow-lg hover:bg-white dark:hover:bg-[#1e1929]'
          : 'bg-offwhite-card dark:bg-[#151821]/80 hover:bg-offwhite-card dark:hover:bg-[#1a1e2a] border-zinc-300/70 dark:border-zinc-800/80 hover:border-zinc-400/90 dark:hover:border-zinc-700 shadow-xs hover:shadow-md'
      }`}
    >
      <div className="p-3.5 space-y-2.5">
        {/* Card Header: Drag handle, Priority, Context badge & Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-700 dark:group-hover:text-zinc-400 cursor-grab">
              <GripVertical className="w-3.5 h-3.5" />
            </span>
            <span className={`text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded border ${getPriorityStyle(task.priority)}`}>
              {task.priority}
            </span>

            {/* In Progress indicator */}
            {isDoingTask && (
              <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                In Progress
              </span>
            )}

            {/* Context Badge (Work vs Personal) */}
            {task.context === 'personal' ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-600 dark:text-pink-300 border border-pink-500/20">
                <Home className="w-2.5 h-2.5" />
                Personal
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20">
                <Briefcase className="w-2.5 h-2.5" />
                Work
              </span>
            )}

            {isFocused && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Focus
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            {task.columnId === 'doing' && onFocusTask && !isFocused && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFocusTask(task.id);
                }}
                className="text-[10px] font-mono text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-200 bg-brand-500/15 hover:bg-brand-500/25 px-1.5 py-0.5 rounded border border-brand-500/30 transition"
                title="Pin as primary active HUD task"
              >
                Set Focus
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              className="p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-offwhite-subtle dark:hover:bg-zinc-800/80 rounded transition"
              title="Edit task"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="p-1 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-offwhite-subtle dark:hover:bg-zinc-800/80 rounded transition"
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Title */}
        <h4 
          onClick={() => onEdit(task)}
          className={`text-sm font-medium leading-snug cursor-pointer hover:text-brand-600 dark:hover:text-brand-300 transition line-clamp-2 ${
            task.columnId === 'done' ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-800 dark:text-zinc-100'
          }`}
        >
          {task.title}
        </h4>

        {/* Optional Description snippet */}
        {task.description && (
          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Checklist Progress Bar & Toggle */}
        {totalSubtasks > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSubtasks(!showSubtasks);
                }}
                className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-200 transition font-mono text-[11px]"
              >
                <CheckSquare className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
                <span>{completedSubtasks}/{totalSubtasks} subtasks</span>
                {showSubtasks ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                {Math.round(progressPercent)}%
              </span>
            </div>

            {/* Micro progress bar */}
            <div className="w-full bg-zinc-200 dark:bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  progressPercent === 100
                    ? 'bg-emerald-500'
                    : progressPercent > 50
                    ? 'bg-brand-500'
                    : 'bg-brand-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Collapsible Subtasks list */}
            {showSubtasks && (
              <div className="pt-2 pb-1 space-y-1.5 pl-1 border-t border-zinc-200 dark:border-zinc-800/60 mt-1">
                {task.subtasks.map((st) => (
                  <label
                    key={st.id}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer group/st"
                  >
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => onToggleSubtask(task.id, st.id)}
                      className="mt-0.5 rounded border-zinc-300 dark:border-zinc-700 bg-offwhite-subtle dark:bg-zinc-900 text-brand-600 focus:ring-brand-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <span className={`flex-1 transition leading-tight ${st.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : ''}`}>
                      {st.title}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {task.tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-offwhite-subtle dark:bg-zinc-800/60 px-1.5 py-0.5 rounded border border-zinc-300/70 dark:border-zinc-700/40"
              >
                <Tag className="w-2.5 h-2.5 text-zinc-500" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Card Footer: Timer info & Quick Move navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-300/60 dark:border-zinc-800/60 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            {task.columnId === 'doing' && onToggleTimer && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTimer(task.id);
                }}
                className={`flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded border transition ${
                  task.isRunning
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border-amber-500/50 ring-1 ring-amber-500/30 shadow-xs'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30'
                }`}
                title={task.isRunning ? "Pause timer" : "Start timer"}
              >
                {task.isRunning ? (
                  <Pause className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                ) : (
                  <Play className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600 dark:text-emerald-500 dark:fill-emerald-500" />
                )}
                <span className="font-semibold">{formatElapsed(task.elapsedSeconds)}</span>
              </button>
            )}

            {task.columnId !== 'doing' && task.elapsedSeconds > 0 && (
              <span className="flex items-center gap-1 font-mono text-[11px] text-brand-600 dark:text-brand-300/90" title="Focus time logged">
                <Clock className="w-3 h-3" />
                {formatElapsed(task.elapsedSeconds)}
              </span>
            )}

            {task.dueDate && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                <Calendar className="w-3 h-3" />
                {task.dueDate}
              </span>
            )}
          </div>

          {/* Quick Flow column arrows */}
          <div className="flex items-center gap-1">
            {prevCol && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(task.id, prevCol);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-offwhite-subtle dark:hover:bg-zinc-800 rounded transition"
                title={`Move to previous column`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            {nextCol && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(task.id, nextCol);
                }}
                className="p-1 text-zinc-400 hover:text-brand-600 dark:hover:text-brand-300 hover:bg-offwhite-subtle dark:hover:bg-zinc-800 rounded transition flex items-center gap-0.5"
                title={`Advance to next column`}
              >
                {nextCol === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
