import React from 'react';
import { AlertOctagon, CheckCircle2, ArrowLeft, X, ShieldAlert } from 'lucide-react';
import { Task } from '../types';

interface WipLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingTask: Task | null;
  doingTasks: Task[];
  wipLimit: number;
  onCompleteDoingTask: (taskId: string) => void;
  onMoveBackToToday: (taskId: string) => void;
  onForceProceed: (pendingTask: Task) => void;
}

export const WipLimitModal: React.FC<WipLimitModalProps> = ({
  isOpen,
  onClose,
  pendingTask,
  doingTasks,
  wipLimit,
  onCompleteDoingTask,
  onMoveBackToToday,
  onForceProceed,
}) => {
  if (!isOpen || !pendingTask) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#13151f] border border-amber-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden ring-1 ring-amber-500/30 text-zinc-900 dark:text-zinc-100">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-amber-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                WIP Focus Guardrail ({doingTasks.length}/{wipLimit})
              </h3>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-300/70">
                Preventing attention fragmentation & task amnesia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-zinc-600 dark:text-zinc-300">
          <p className="leading-relaxed">
            You are attempting to bring <span className="font-semibold text-zinc-900 dark:text-white">"{pendingTask.title}"</span> into <span className="text-amber-600 dark:text-amber-300 font-mono">In Progress</span>, but you already have <span className="font-semibold text-amber-600 dark:text-amber-300">{wipLimit} active tasks</span>.
          </p>

          <div className="bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-2">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Currently in your focus lane:
            </span>
            {doingTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800/80"
              >
                <div className="truncate flex-1">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{t.title}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Elapsed: {Math.floor(t.elapsedSeconds / 60)}m {t.elapsedSeconds % 60}s
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      onMoveBackToToday(t.id);
                      onForceProceed(pendingTask);
                    }}
                    className="flex items-center gap-1 text-[10px] font-medium bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded transition"
                    title="Move back to 'To Do Today' to free up this focus slot"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Park to Today</span>
                  </button>
                  <button
                    onClick={() => {
                      onCompleteDoingTask(t.id);
                      onForceProceed(pendingTask);
                    }}
                    className="flex items-center gap-1 text-[10px] font-medium bg-emerald-600/90 hover:bg-emerald-500 text-white px-2 py-1 rounded transition"
                    title="Mark finished"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Finish</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-[11px] text-amber-800 dark:text-amber-200/80 flex items-start gap-2">
            <AlertOctagon className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Focus tip:</strong> Context-switching degrades working memory by up to 40%. Finishing or parking a task ensures full flow state.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between text-xs">
          <button
            onClick={() => onForceProceed(pendingTask)}
            className="text-[11px] text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 underline transition"
          >
            Override limit (Emergency)
          </button>
          <button
            onClick={onClose}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-xl font-medium transition active:scale-95"
          >
            Keep Focus & Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
