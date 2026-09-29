import React, { useEffect, useState } from 'react';
import { X, Check, Trash2, LayoutGrid, Plus, Edit3, Send } from 'lucide-react';
import { MapNode, Task } from '../../types';
import { getModuleProgress, isTaskDone } from '../../utils/projectMap';

interface ModulePanelProps {
  node: MapNode;
  color: string;
  tasks: Task[];
  onClose: () => void;
  onRename: (title: string) => void;
  onUpdateNotes: (notes: string) => void;
  onToggleManualDone: () => void;
  onAddTasks: (titles: string[]) => void;
  onToggleTaskDone: (task: Task) => void;
  onRenameTask: (task: Task, title: string) => void;
  onToggleTaskOnBoard: (task: Task) => void;
  onSendAllOpenToBoard: () => void;
  onDeleteTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteModule: (keepCards: boolean) => void;
}

const TaskRow: React.FC<{
  task: Task;
  onToggleDone: () => void;
  onRename: (title: string) => void;
  onToggleOnBoard: () => void;
  onDelete: () => void;
  onEdit: () => void;
}> = ({ task, onToggleDone, onRename, onToggleOnBoard, onDelete, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const done = isTaskDone(task);
  const onBoard = task.isOnBoard !== false;

  const commit = () => {
    setIsEditing(false);
    if (draft.trim() && draft.trim() !== task.title) onRename(draft.trim());
    else setDraft(task.title);
  };

  return (
    <li className="group flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-offwhite-subtle/60 dark:hover:bg-zinc-800/40">
      <button
        onClick={onToggleDone}
        className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center transition ${
          done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-400 dark:border-zinc-600 hover:border-emerald-500'
        }`}
        title={done ? 'Mark not done' : 'Mark done'}
      >
        {done && <Check className="w-3 h-3" />}
      </button>

      {isEditing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            else if (e.key === 'Escape') {
              setDraft(task.title);
              setIsEditing(false);
            }
          }}
          className="flex-1 min-w-0 text-xs px-1.5 py-0.5 rounded bg-offwhite-input dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100"
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={`flex-1 min-w-0 text-xs cursor-text break-words ${
            done ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-800 dark:text-zinc-200'
          }`}
        >
          {task.title}
        </span>
      )}

      <button
        onClick={onToggleOnBoard}
        title={onBoard ? 'On the board: click to keep it on the map only' : 'Send to board'}
        className={`p-1 rounded transition ${
          onBoard ? 'text-brand-600 dark:text-brand-400 bg-brand-500/10' : 'text-zinc-400 opacity-60 sm:opacity-0 group-hover:opacity-100 hover:text-brand-600'
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onEdit}
        title="Edit details"
        className="p-1 rounded text-zinc-400 opacity-60 sm:opacity-0 group-hover:opacity-100 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
      >
        <Edit3 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onDelete}
        title="Delete task"
        className="p-1 rounded text-zinc-400 opacity-60 sm:opacity-0 group-hover:opacity-100 hover:text-red-500 transition"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </li>
  );
};

export const ModulePanel: React.FC<ModulePanelProps> = ({
  node,
  color,
  tasks,
  onClose,
  onRename,
  onUpdateNotes,
  onToggleManualDone,
  onAddTasks,
  onToggleTaskDone,
  onRenameTask,
  onToggleTaskOnBoard,
  onSendAllOpenToBoard,
  onDeleteTask,
  onEditTask,
  onDeleteModule,
}) => {
  const [title, setTitle] = useState(node.title);
  const [notes, setNotes] = useState(node.notes || '');
  const [newTask, setNewTask] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setTitle(node.title);
    setNotes(node.notes || '');
    setConfirmDelete(false);
  }, [node.id, node.title, node.notes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const progress = getModuleProgress(node, tasks);
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : progress.isDone ? 100 : 0;
  const openOffBoard = tasks.filter((t) => !isTaskDone(t) && t.isOnBoard === false).length;

  const submitNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    // Pasting several lines adds one task per line
    const titles = newTask.split('\n').map((s) => s.replace(/^[-*•]\s*(\[[ x]\]\s*)?/i, '').trim()).filter(Boolean);
    if (titles.length > 0) onAddTasks(titles);
    setNewTask('');
  };

  return (
    <aside className="fixed inset-0 z-40 sm:inset-auto sm:top-0 sm:right-0 sm:bottom-0 sm:w-[420px] flex flex-col bg-offwhite-surface dark:bg-[#12151f] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in slide-in-from-right duration-200">
      <div className="h-1.5 shrink-0" style={{ backgroundColor: color }} />
      <div className="flex items-start gap-2 p-4 border-b border-zinc-200 dark:border-zinc-800">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() !== node.title && onRename(title.trim())}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="flex-1 min-w-0 text-base font-bold bg-transparent text-zinc-900 dark:text-white focus:outline-none border-b border-transparent focus:border-brand-500"
        />
        <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" title="Close (Esc)">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {progress.isDone ? 'Done' : 'Progress'}
            </span>
            <span className="font-mono text-zinc-500 dark:text-zinc-400">
              {progress.total > 0 ? `${progress.done}/${progress.total} · ${pct}%` : 'No tasks'}
            </span>
          </div>
          <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          {progress.total === 0 && (
            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 pt-1 cursor-pointer">
              <input type="checkbox" checked={!!node.isDoneManual} onChange={onToggleManualDone} className="accent-emerald-500" />
              Mark this module done
            </label>
          )}
        </div>

        {/* Tasks */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Tasks</h3>
            {openOffBoard > 0 && (
              <button
                onClick={onSendAllOpenToBoard}
                className="text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                <Send className="w-3 h-3" /> Send {openOffBoard} open to board
              </button>
            )}
          </div>
          {tasks.length > 0 && (
            <ul className="-mx-2">
              {tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onToggleDone={() => onToggleTaskDone(t)}
                  onRename={(title) => onRenameTask(t, title)}
                  onToggleOnBoard={() => onToggleTaskOnBoard(t)}
                  onDelete={() => onDeleteTask(t)}
                  onEdit={() => onEditTask(t)}
                />
              ))}
            </ul>
          )}
          <form onSubmit={submitNewTask} className="flex items-start gap-2">
            <textarea
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitNewTask(e);
                }
              }}
              rows={1}
              placeholder="Add a task (paste a list to add many)"
              className="flex-1 text-xs px-3 py-2 rounded-xl bg-offwhite-input dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none"
            />
            <button type="submit" className="p-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition" title="Add task">
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Notes</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== (node.notes || '') && onUpdateNotes(notes)}
            rows={5}
            placeholder="Scope, decisions, links…"
            className="w-full text-xs px-3 py-2 rounded-xl bg-offwhite-input dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* Delete */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        {confirmDelete ? (
          <div className="space-y-2">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {tasks.length > 0 ? `What should happen to this module's ${tasks.length} cards?` : 'Delete this module?'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => onDeleteModule(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition">
                {tasks.length > 0 ? 'Delete module and cards' : 'Delete module'}
              </button>
              {tasks.length > 0 && (
                <button onClick={() => onDeleteModule(true)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                  Keep cards on the board
                </button>
              )}
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="text-xs text-zinc-400 hover:text-red-500 flex items-center gap-1.5 transition">
            <Trash2 className="w-3.5 h-3.5" /> Delete module
          </button>
        )}
      </div>
    </aside>
  );
};
