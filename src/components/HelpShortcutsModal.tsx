import React from 'react';
import { X, Keyboard, Zap, Shield, CheckCircle2, Clock } from 'lucide-react';

interface HelpShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpShortcutsModal: React.FC<HelpShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-offwhite-surface dark:bg-[#12151e] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-offwhite-subtle/60 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Headroom Guide & Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-lg hover:bg-offwhite-subtle dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 text-xs text-zinc-600 dark:text-zinc-300 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Shortcuts Table */}
          <div>
            <h4 className="font-semibold text-zinc-700 dark:text-zinc-200 text-xs mb-2 uppercase tracking-wider font-mono">
              Keyboard Shortcuts
            </h4>
            <div className="space-y-1.5 bg-offwhite-subtle/50 dark:bg-zinc-900/80 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between py-1 border-b border-zinc-200/80 dark:border-zinc-800/60">
                <span className="text-zinc-700 dark:text-zinc-300">Quick capture new task</span>
                <kbd className="font-mono bg-offwhite-card dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 text-[11px] shadow-xs dark:shadow-none">
                  Ctrl + K &nbsp;or&nbsp; N
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-zinc-200/80 dark:border-zinc-800/60">
                <span className="text-zinc-700 dark:text-zinc-300">Close modal / Cancel input</span>
                <kbd className="font-mono bg-offwhite-card dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 text-[11px] shadow-xs dark:shadow-none">
                  Escape
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-zinc-200/80 dark:border-zinc-800/60">
                <span className="text-zinc-700 dark:text-zinc-300">Switch to Focus Board</span>
                <kbd className="font-mono bg-offwhite-card dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 text-[11px] shadow-xs dark:shadow-none">
                  Alt + 1
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-zinc-200/80 dark:border-zinc-800/60">
                <span className="text-zinc-700 dark:text-zinc-300">Switch to Financial Headroom</span>
                <kbd className="font-mono bg-offwhite-card dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 text-[11px] shadow-xs dark:shadow-none">
                  Alt + 2
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-zinc-700 dark:text-zinc-300">Open this cheat sheet</span>
                <kbd className="font-mono bg-offwhite-card dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 text-[11px] shadow-xs dark:shadow-none">
                  ?
                </kbd>
              </div>
            </div>
          </div>

          {/* Workflow Philosophy */}
          <div>
            <h4 className="font-semibold text-zinc-700 dark:text-zinc-200 text-xs mb-2 uppercase tracking-wider font-mono">
              Flow Principles
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 bg-offwhite-card/90 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1 shadow-xs">
                <div className="flex items-center gap-1.5 text-brand-600 dark:text-brand-300 font-medium">
                  <Shield className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
                  <span>Strict WIP Limit (2)</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Never keep more than 2 items in "Doing". Multitasking creates false productivity and high cognitive fatigue.
                </p>
              </div>

              <div className="p-3 bg-offwhite-card/90 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1 shadow-xs">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300 font-medium">
                  <Clock className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>Persistent Focus HUD</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  The top bar stays locked onto what you are working on right now, preventing "What was I doing?" moments.
                </p>
              </div>

              <div className="p-3 bg-offwhite-card/90 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1 shadow-xs">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-300 font-medium">
                  <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Brain Dump Buffer</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Got an intrusive thought or side idea? Dump it immediately into the Backlog without derailing your current task.
                </p>
              </div>

              <div className="p-3 bg-offwhite-card/90 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1 shadow-xs">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-300 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>Micro Checklists</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Break intimidating cards into bite-sized subtasks. Checking off subtasks builds dopamine momentum.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-offwhite-subtle/60 dark:bg-zinc-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
