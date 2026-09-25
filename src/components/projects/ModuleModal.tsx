import React, { useState, useEffect } from 'react';
import { ProjectModule, ModuleStatus } from '../../types';
import { X, Layers } from 'lucide-react';

interface ModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<ProjectModule>) => void;
  initialModule?: ProjectModule | null;
}

export const ModuleModal: React.FC<ModuleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialModule,
}) => {
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<ModuleStatus>('in-progress');
  const [version, setVersion] = useState('');
  const [techStackInput, setTechStackInput] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialModule) {
      setName(initialModule.name);
      setSummary(initialModule.summary || '');
      setStatus(initialModule.status);
      setVersion(initialModule.version || '');
      setTechStackInput(initialModule.techStack?.join(', ') || '');
      setNotes(initialModule.notes || '');
    } else {
      setName('');
      setSummary('');
      setStatus('in-progress');
      setVersion('v0.1.0');
      setTechStackInput('');
      setNotes('');
    }
  }, [initialModule, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const techStack = techStackInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      name: name.trim(),
      summary: summary.trim(),
      status,
      version: version.trim() || undefined,
      techStack,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-offwhite-surface dark:bg-[#12151f] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                {initialModule ? 'Edit Module' : 'Create New Module'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Define the deliverable scope, status, and tech architecture
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Module Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Module Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Retention Sample Module"
              className="w-full text-sm px-3.5 py-2 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 font-medium"
              autoFocus
            />
          </div>

          {/* Module Summary */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Functional Summary
            </label>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief description of what this module accomplishes..."
              className="w-full text-xs px-3.5 py-2 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>

          {/* Status & Version Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ModuleStatus)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100"
              >
                <option value="planning">Planning (Scoping unknowns)</option>
                <option value="in-progress">In Progress (Active building)</option>
                <option value="review">Review (Testing & Polish)</option>
                <option value="shipped">Shipped (Production complete)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Version Tag
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. v0.8.2 or v1.0.0"
                className="w-full text-xs px-3 py-2 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 font-mono"
              />
            </div>
          </div>

          {/* Tech Stack Chips */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Tech Stack & Dependencies (comma-separated)
            </label>
            <input
              type="text"
              value={techStackInput}
              onChange={(e) => setTechStackInput(e.target.value)}
              placeholder="e.g. Swift, TypeScript, Analytics Engine"
              className="w-full text-xs px-3.5 py-2 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>

          {/* Notes / Constraints */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Architectural Notes / Release Constraints
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Must comply with privacy consent before 1.0 release..."
              className="w-full text-xs px-3.5 py-2 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 italic"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition"
            >
              {initialModule ? 'Save Changes' : 'Create Module'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
