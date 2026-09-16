import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  CheckSquare, 
  Tag, 
  Calendar, 
  Sparkles,
  Briefcase,
  Home
} from 'lucide-react';
import { Task, Subtask, Priority, ColumnId, TaskContext } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => void;
  initialTask?: Task | null;
  defaultColumnId?: ColumnId;
  defaultContext?: TaskContext;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
  defaultColumnId = 'backlog',
  defaultContext = 'work',
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState<ColumnId>(defaultColumnId);
  const [priority, setPriority] = useState<Priority>('medium');
  const [context, setContext] = useState<TaskContext>(defaultContext);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setColumnId(initialTask.columnId);
      setPriority(initialTask.priority);
      setContext(initialTask.context || 'work');
      setSubtasks(initialTask.subtasks || []);
      setTags(initialTask.tags || []);
      setDueDate(initialTask.dueDate || '');
    } else {
      setTitle('');
      setDescription('');
      setColumnId(defaultColumnId);
      setPriority('medium');
      setContext(defaultContext);
      setSubtasks([]);
      setTags([]);
      setDueDate('');
    }
  }, [initialTask, defaultColumnId, defaultContext, isOpen]);

  if (!isOpen) return null;

  const handleAddSubtask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      {
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: newSubtaskTitle.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (subId: string) => {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === subId ? { ...st, completed: !st.completed } : st))
    );
  };

  const handleRemoveSubtask = (subId: string) => {
    setSubtasks((prev) => prev.filter((st) => st.id !== subId));
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const cleaned = tagInput.trim().replace(/^#/, '');
      if (cleaned && !tags.includes(cleaned)) {
        setTags([...tags, cleaned]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      columnId,
      priority,
      context,
      subtasks,
      tags,
      dueDate: dueDate || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-offwhite-surface dark:bg-[#12151e] border border-zinc-300/80 dark:border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-zinc-800 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-300/70 dark:border-zinc-800 flex items-center justify-between bg-offwhite-subtle/70 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold">
              {initialTask ? 'Edit Task' : 'Create New Task'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-offwhite-subtle dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Task Title <span className="text-brand-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Prepare client onboarding deck"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs sm:text-sm bg-offwhite-input dark:bg-zinc-900 border border-zinc-300/80 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition"
            />
          </div>

          {/* Context Selector (Work vs Personal) */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Context / Sphere
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setContext('work')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium border transition ${
                  context === 'work'
                    ? 'bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/40'
                    : 'bg-offwhite-subtle dark:bg-zinc-900/60 border-zinc-300/70 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                }`}
              >
                <Briefcase className="w-4 h-4 text-blue-500" />
                <span>Work / Professional</span>
              </button>

              <button
                type="button"
                onClick={() => setContext('personal')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium border transition ${
                  context === 'personal'
                    ? 'bg-pink-500/15 border-pink-500 text-pink-700 dark:text-pink-300 ring-1 ring-pink-500/40'
                    : 'bg-offwhite-subtle dark:bg-zinc-900/60 border-zinc-300/70 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                }`}
              >
                <Home className="w-4 h-4 text-pink-500" />
                <span>Personal / Home</span>
              </button>
            </div>
          </div>

          {/* Lane & Priority row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                Column Lane
              </label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value as ColumnId)}
                className="w-full text-xs bg-offwhite-input dark:bg-zinc-900 border border-zinc-300/80 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                <option value="backlog">Brain Dump (Backlog)</option>
                <option value="today">To Do Today</option>
                <option value="doing">In Progress (Doing)</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                Priority
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['urgent', 'high', 'medium', 'low'] as Priority[]).map((p) => {
                  const isSelected = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`text-[11px] py-1.5 rounded-lg font-mono font-medium uppercase border transition ${
                        isSelected
                          ? p === 'urgent'
                            ? 'bg-red-500/20 text-red-600 dark:text-red-300 border-red-500/50 ring-1 ring-red-500/40'
                            : p === 'high'
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/50 ring-1 ring-amber-500/40'
                            : p === 'medium'
                            ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/50 ring-1 ring-blue-500/40'
                            : 'bg-zinc-200 dark:bg-zinc-700/40 text-zinc-800 dark:text-zinc-200 border-zinc-400 ring-1 ring-zinc-500/40'
                          : 'bg-offwhite-subtle dark:bg-zinc-900/80 text-zinc-600 border-zinc-300/70 dark:border-zinc-800 hover:text-zinc-900'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-400 mb-1">
              Description / Actionable Notes
            </label>
            <textarea
              rows={3}
              placeholder="What specifically does success look like?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs bg-offwhite-input dark:bg-zinc-900 border border-zinc-300/80 dark:border-zinc-700/80 rounded-xl p-3 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition leading-relaxed"
            />
          </div>

          {/* Subtasks Checklist */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-300">
                <CheckSquare className="w-3.5 h-3.5 text-brand-500" />
                <span>Micro-Steps Checklist ({subtasks.filter(s => s.completed).length}/{subtasks.length})</span>
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">
                Bite-sized steps make starting easy
              </span>
            </div>

            {/* Existing Subtask list */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto mb-2 pr-1">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-offwhite-card dark:bg-zinc-900/90 border border-zinc-300/70 dark:border-zinc-800/80 text-xs group"
                >
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => handleToggleSubtask(st.id)}
                      className="rounded border-zinc-300 dark:border-zinc-700 bg-offwhite-input dark:bg-zinc-950 text-brand-600 focus:ring-0 h-3.5 w-3.5 cursor-pointer"
                    />
                    <span className={`truncate ${st.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-800 dark:text-zinc-200'}`}>
                      {st.title}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(st.id)}
                    className="text-zinc-400 hover:text-red-500 p-1 rounded transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Subtask input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add concrete next step... (Hit Enter)"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="flex-1 text-xs bg-offwhite-input dark:bg-zinc-900/60 border border-zinc-300/80 dark:border-zinc-700/60 rounded-lg px-3 py-1.5 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => handleAddSubtask()}
                className="text-xs bg-offwhite-subtle dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1 font-medium"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Tags & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                <Tag className="w-3 h-3 text-zinc-400" />
                <span>Tags</span>
              </label>
              <div className="flex flex-wrap gap-1 mb-1.5 min-h-[24px]">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[10px] font-mono bg-offwhite-subtle dark:bg-zinc-800 border border-zinc-300/70 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-zinc-400 hover:text-zinc-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Type tag & press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="w-full text-xs bg-offwhite-input dark:bg-zinc-900 border border-zinc-300/80 dark:border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-400 mb-1">
                <Calendar className="w-3 h-3 text-zinc-400" />
                <span>Target Date (Optional)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs bg-offwhite-input dark:bg-zinc-900 border border-zinc-300/80 dark:border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-300/70 dark:border-zinc-800 bg-offwhite-subtle/70 dark:bg-zinc-950/60 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 px-4 py-2 rounded-xl hover:bg-offwhite-subtle dark:hover:bg-zinc-800/80 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-xl shadow-lg shadow-brand-500/20 transition active:scale-95"
          >
            {initialTask ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};
