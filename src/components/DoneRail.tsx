import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ChevronRight, 
  X, 
  Trash2, 
  RotateCcw, 
  Search, 
  Archive, 
  Clock, 
  Tag
} from 'lucide-react';
import { Task } from '../types';
import { getTaskColorConfig } from '../utils/cardColors';

interface DoneRailProps {
  tasks: Task[];
  onRestoreTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDropTask: (e: React.DragEvent) => void;
  onClearDone?: () => void;
}

export const DoneRail: React.FC<DoneRailProps> = ({
  tasks,
  onRestoreTask,
  onDeleteTask,
  onDropTask,
  onClearDone,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDropTask(e);
  };

  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  const formatCompletedDate = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* 48px Collapsed Vertical Rail (Desktop) / Archive Bar (Mobile) */}
      <aside
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => setIsOpen(true)}
        className={`w-full lg:w-12 shrink-0 select-none rounded-2xl border transition-all duration-200 cursor-pointer flex flex-row lg:flex-col items-center px-4 py-3 lg:px-0 lg:py-4 justify-between self-stretch min-h-[52px] lg:min-h-[460px] ${
          isDragOver
            ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20 scale-[1.01] lg:scale-[1.02]'
            : 'bg-offwhite-surface/80 dark:bg-zinc-900/60 hover:bg-offwhite-card dark:hover:bg-zinc-900/90 border-zinc-300/70 dark:border-zinc-800/80 shadow-xs hover:border-emerald-500/50'
        }`}
        title="Completed Tasks Archive (Click to open, drag tasks here to complete)"
      >
        {/* Top/Left: Icon & Counter Badge */}
        <div className="flex flex-row lg:flex-col items-center gap-2">
          <div className={`p-2 rounded-xl border transition ${
            isDragOver 
              ? 'bg-emerald-500 text-white border-emerald-400 animate-bounce' 
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
          }`}>
            <CheckCircle2 className="w-4 h-4" />
          </div>

          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            {tasks.length}
          </span>
        </div>

        {/* Center: Typography */}
        <div className="flex items-center justify-center lg:my-auto">
          <span 
            className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 lg:rotate-180 transition hover:text-emerald-600 dark:hover:text-emerald-400 whitespace-nowrap [writing-mode:horizontal-tb] lg:[writing-mode:vertical-rl]"
          >
            Done Archive
          </span>
        </div>

        {/* Bottom/Right: Drop Hint & Open Trigger */}
        <div className="flex items-center gap-1 text-zinc-400 hover:text-emerald-500 transition">
          <span className="text-[11px] font-medium lg:hidden">View Archive</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </aside>

      {/* Slide-over Archive Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-offwhite-surface dark:bg-[#12151e] border-l border-zinc-300/80 dark:border-zinc-800 shadow-2xl flex flex-col text-zinc-800 dark:text-zinc-100 animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-offwhite-subtle/70 dark:bg-zinc-950/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">Completed Archive</h3>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        {tasks.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Shipped accomplishments & reference history
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-offwhite-subtle dark:hover:bg-zinc-800 transition"
                  title="Close drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Controls: Search & Clear */}
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search completed tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-offwhite-input dark:bg-zinc-900 border border-zinc-300/80 dark:border-zinc-700/80 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {onClearDone && tasks.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearDone}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/20 transition shrink-0 flex items-center gap-1"
                    title="Clear all completed tasks"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Drawer Tasks List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredTasks.map((task) => {
                  const colorCfg = getTaskColorConfig(task.color);
                  const hasCustomColor = task.color && task.color !== 'default';

                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-xl border transition ${
                        hasCustomColor 
                          ? `${colorCfg.bgClass} ${colorCfg.borderClass} ${colorCfg.borderLeftClass}` 
                          : 'bg-offwhite-card dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-medium line-through text-zinc-400 dark:text-zinc-500 leading-snug">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-[11px] text-zinc-400/80 dark:text-zinc-600 line-clamp-2 mt-1">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onRestoreTask(task.id)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-500/10 transition"
                            title="Restore back to Today"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition"
                            title="Permanently delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Card Meta & Completed Time */}
                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-[10px] text-zinc-400">
                        <div className="flex items-center gap-2">
                          <span className="uppercase font-mono font-semibold px-1.5 py-0.2 rounded border text-[9px]">
                            {task.priority}
                          </span>
                          {task.tags && task.tags.length > 0 && (
                            <span className="flex items-center gap-1 font-mono">
                              <Tag className="w-2.5 h-2.5" />
                              {task.tags[0]}
                            </span>
                          )}
                        </div>

                        {task.completedAt && (
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-2.5 h-2.5 text-emerald-500" />
                            {formatCompletedDate(task.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredTasks.length === 0 && (
                  <div className="h-48 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                    <Archive className="w-8 h-8 opacity-40 mb-2" />
                    <p className="text-xs font-medium">No completed tasks found</p>
                    <p className="text-[11px] opacity-75 mt-0.5">
                      {searchQuery ? 'Try another search term' : 'Drag tasks to the rail to archive them'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
