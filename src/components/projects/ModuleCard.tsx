import React, { useState } from 'react';
import { 
  ProjectModule, 
  ModuleScopeItem, 
  ModuleStatus,
  Task
} from '../../types';
import { 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Send,
  Tag,
  Lock,
  MessageSquare
} from 'lucide-react';

interface ModuleCardProps {
  module: ProjectModule;
  projectName: string;
  tasks: Task[];
  onUpdateModule: (updated: ProjectModule) => void;
  onDeleteModule: (moduleId: string) => void;
  onEditModule: (module: ProjectModule) => void;
  onPromoteToKanban: (module: ProjectModule, item: ModuleScopeItem) => void;
  onUpdateScopeItem: (module: ProjectModule, item: ModuleScopeItem, newTitle: string, newDetails?: string) => void;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  module,
  projectName,
  tasks,
  onUpdateModule,
  onDeleteModule,
  onEditModule,
  onPromoteToKanban,
  onUpdateScopeItem,
}) => {
  const [newMissingTitle, setNewMissingTitle] = useState('');
  const [newDoneTitle, setNewDoneTitle] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showDoneList, setShowDoneList] = useState(true);

  // Inline editing state for individual scope items
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState('');
  const [editingItemDetails, setEditingItemDetails] = useState('');

  // Transient feedback state when user clicks "To Board"
  const [justSentItemId, setJustSentItemId] = useState<string | null>(null);

  // Completion calculation
  const doneCount = module.doneItems.length;
  const missingCount = module.missingItems.length;
  const totalCount = doneCount + missingCount;
  const percentage = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Status badge colors
  const getStatusBadge = (status: ModuleStatus) => {
    switch (status) {
      case 'shipped':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
      case 'in-progress':
        return 'bg-brand-500/15 text-brand-700 dark:text-brand-300 border-brand-500/30';
      case 'review':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case 'planning':
      default:
        return 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30';
    }
  };

  const getStatusLabel = (status: ModuleStatus) => {
    switch (status) {
      case 'shipped': return 'Shipped';
      case 'in-progress': return 'In Progress';
      case 'review': return 'Review';
      case 'planning': return 'Planning';
    }
  };

  // Get status of item on Kanban board (if sent)
  const getLinkedTaskStatus = (item: ModuleScopeItem) => {
    if (!item.linkedTaskId) return null;
    const linked = tasks.find((t) => t.id === item.linkedTaskId);
    if (!linked) return null;

    switch (linked.columnId) {
      case 'doing':
        return {
          label: 'On Board: In Progress',
          color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
        };
      case 'today':
        return {
          label: 'On Board: Today',
          color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
        };
      case 'backlog':
        return {
          label: 'On Board: Backlog',
          color: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
        };
      case 'done':
        return {
          label: 'On Board: Done',
          color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
        };
    }
  };

  // Move missing item to done
  const handleMarkItemDone = (item: ModuleScopeItem) => {
    const updatedMissing = module.missingItems.filter((i) => i.id !== item.id);
    const updatedDone = [
      ...module.doneItems,
      {
        ...item,
        completed: true,
        completedAt: Date.now(),
      },
    ];
    onUpdateModule({
      ...module,
      missingItems: updatedMissing,
      doneItems: updatedDone,
      updatedAt: Date.now(),
    });
  };

  // Move done item back to missing
  const handleMarkItemMissing = (item: ModuleScopeItem) => {
    const updatedDone = module.doneItems.filter((i) => i.id !== item.id);
    const updatedMissing = [
      ...module.missingItems,
      {
        ...item,
        completed: false,
        completedAt: undefined,
      },
    ];
    onUpdateModule({
      ...module,
      doneItems: updatedDone,
      missingItems: updatedMissing,
      updatedAt: Date.now(),
    });
  };

  // Add new missing item
  const handleAddMissingItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMissingTitle.trim()) return;

    const newItem: ModuleScopeItem = {
      id: `scope-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newMissingTitle.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    onUpdateModule({
      ...module,
      missingItems: [...module.missingItems, newItem],
      updatedAt: Date.now(),
    });
    setNewMissingTitle('');
  };

  // Add new done item directly
  const handleAddDoneItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoneTitle.trim()) return;

    const newItem: ModuleScopeItem = {
      id: `scope-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newDoneTitle.trim(),
      completed: true,
      createdAt: Date.now(),
      completedAt: Date.now(),
    };

    onUpdateModule({
      ...module,
      doneItems: [...module.doneItems, newItem],
      updatedAt: Date.now(),
    });
    setNewDoneTitle('');
  };

  // Delete an item
  const handleDeleteItem = (itemId: string, fromDone: boolean) => {
    if (fromDone) {
      onUpdateModule({
        ...module,
        doneItems: module.doneItems.filter((i) => i.id !== itemId),
        updatedAt: Date.now(),
      });
    } else {
      onUpdateModule({
        ...module,
        missingItems: module.missingItems.filter((i) => i.id !== itemId),
        updatedAt: Date.now(),
      });
    }
  };

  // Item inline edit handlers
  const startEditingItem = (item: ModuleScopeItem) => {
    setEditingItemId(item.id);
    setEditingItemTitle(item.title);
    setEditingItemDetails(item.details || '');
  };

  const cancelEditingItem = () => {
    setEditingItemId(null);
    setEditingItemTitle('');
    setEditingItemDetails('');
  };

  const saveEditingItem = (item: ModuleScopeItem) => {
    if (!editingItemTitle.trim()) return;
    onUpdateScopeItem(module, item, editingItemTitle.trim(), editingItemDetails.trim() || undefined);
    setEditingItemId(null);
  };

  // Promote to board with feedback & locking
  const handleSendToBoard = (item: ModuleScopeItem) => {
    setJustSentItemId(item.id);
    onPromoteToKanban(module, item);
    setTimeout(() => {
      setJustSentItemId((curr) => (curr === item.id ? null : curr));
    }, 2200);
  };

  // Copy AI coding prompt for LLM
  const handleCopyAiPrompt = () => {
    const promptText = `### Project: ${projectName}\n### Module: ${module.name} (${percentage}% Complete)\n${module.summary ? `Summary: ${module.summary}\n` : ''}${module.techStack?.length ? `Tech Stack: ${module.techStack.join(', ')}\n` : ''}\n**Implemented Features (Done):**\n${module.doneItems.map((d) => `- [x] ${d.title}${d.details ? ` (${d.details})` : ''}`).join('\n') || '- None yet'}\n\n**Missing / Pending Deliverables:**\n${module.missingItems.map((m) => `- [ ] ${m.title}${m.details ? ` (${m.details})` : ''}`).join('\n') || '- All deliverables complete!'}\n\n${module.notes ? `**Notes / Constraints:**\n${module.notes}\n\n` : ''}**Task for Assistant:**\nPlease review the current implementation status and help me implement the missing items above. Provide clear, modular code snippets with strict types and tests.`;

    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2200);
  };

  return (
    <div className="bg-offwhite-surface dark:bg-[#12151f] rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
      
      {/* Top Banner / Header */}
      <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(module.status)}`}>
                {getStatusLabel(module.status)}
              </span>
              {module.version && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
                  {module.version}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tracking-tight truncate">
              {module.name}
            </h3>
            {module.summary && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                {module.summary}
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleCopyAiPrompt}
              className={`p-1.5 rounded-lg border text-xs font-medium transition flex items-center gap-1 ${
                copiedPrompt
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              title="Copy AI Prompt formatted for Cursor/Claude/Gemini"
            >
              {copiedPrompt ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span className="text-[11px] hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  <span className="text-[11px] hidden sm:inline">AI Prompt</span>
                </>
              )}
            </button>

            <button
              onClick={() => onEditModule(module)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              title="Edit Module Details"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                if (window.confirm(`Delete module "${module.name}"?`)) {
                  onDeleteModule(module.id);
                }
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
              title="Delete Module"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tech Stack Chips */}
        {module.techStack && module.techStack.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {module.techStack.map((tech, idx) => (
              <span
                key={idx}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/50"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        {/* Progress Bar & KPI */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">
              Progress: <strong className="text-zinc-800 dark:text-zinc-200">{doneCount}</strong> of {totalCount} items
            </span>
            <span className={`font-mono font-bold text-xs ${
              percentage === 100 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-brand-600 dark:text-brand-400'
            }`}>
              {percentage}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                percentage === 100
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-brand-600 to-indigo-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Done vs Missing Scope Split Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200/80 dark:divide-zinc-800/80 bg-zinc-50/50 dark:bg-[#0e1017]">
        
        {/* LEFT COLUMN: WHAT'S DONE */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                What's Done
              </span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                {doneCount}
              </span>
            </div>
            <button
              onClick={() => setShowDoneList(!showDoneList)}
              className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            >
              {showDoneList ? 'Collapse' : 'Expand'}
            </button>
          </div>

          {showDoneList && (
            <div className="space-y-2 flex-1 min-h-[80px]">
              {module.doneItems.length === 0 ? (
                <div className="h-full flex items-center justify-center p-3 text-center text-xs text-zinc-400 dark:text-zinc-500 italic border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                  No completed deliverables yet. Check off items on the right as you build!
                </div>
              ) : (
                module.doneItems.map((item) => {
                  const isEditing = editingItemId === item.id;
                  const linkedStatus = getLinkedTaskStatus(item);

                  if (isEditing) {
                    return (
                      <div key={item.id} className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-500/50 shadow-sm space-y-2 text-xs">
                        <input
                          type="text"
                          value={editingItemTitle}
                          onChange={(e) => setEditingItemTitle(e.target.value)}
                          className="w-full text-xs font-medium px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-zinc-100"
                          placeholder="Feature title..."
                          autoFocus
                        />
                        <textarea
                          rows={2}
                          value={editingItemDetails}
                          onChange={(e) => setEditingItemDetails(e.target.value)}
                          className="w-full text-[11px] px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
                          placeholder="Comments, notes, or implementation details..."
                        />
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={cancelEditingItem}
                            className="px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEditingItem(item)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-xs"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      className="group flex flex-col gap-1 p-2 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 hover:border-emerald-500/30 transition text-xs"
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => handleMarkItemMissing(item)}
                          className="mt-0.5 text-emerald-500 hover:text-amber-500 transition shrink-0"
                          title="Move back to Missing"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <span className="flex-1 text-zinc-700 dark:text-zinc-300 line-through opacity-85 leading-snug">
                          {item.title}
                        </span>

                        {/* Linked status badge or actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {linkedStatus && (
                            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-mono font-medium flex items-center gap-1 ${linkedStatus.color}`}>
                              <Lock className="w-2.5 h-2.5" />
                              <span>{linkedStatus.label}</span>
                            </span>
                          )}
                          <button
                            onClick={() => startEditingItem(item)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition p-0.5"
                            title="Edit Title & Comments"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, true)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition p-0.5"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Display comments/details if any */}
                      {item.details && (
                        <div className="ml-6 mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-100/60 dark:bg-zinc-800/40 px-2 py-1 rounded-md border border-zinc-200/40 dark:border-zinc-700/40 flex items-start gap-1.5">
                          <MessageSquare className="w-3 h-3 text-zinc-400 shrink-0 mt-0.5" />
                          <span className="italic leading-relaxed">{item.details}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Quick add directly to Done */}
          <form onSubmit={handleAddDoneItem} className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-1.5">
            <input
              type="text"
              value={newDoneTitle}
              onChange={(e) => setNewDoneTitle(e.target.value)}
              placeholder="+ Log finished feature..."
              className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-zinc-400"
            />
            {newDoneTitle.trim() && (
              <button
                type="submit"
                className="px-2 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 transition"
              >
                Add
              </button>
            )}
          </form>
        </div>

        {/* RIGHT COLUMN: WHAT'S MISSING */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                What's Still Missing
              </span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                {missingCount}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400">
              {missingCount === 0 ? 'Ready to ship!' : 'Needs focus'}
            </span>
          </div>

          <div className="space-y-2 flex-1 min-h-[80px]">
            {module.missingItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-3 text-center text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border border-dashed border-emerald-300 dark:border-emerald-800/60 rounded-xl">
                <CheckCircle2 className="w-5 h-5 mb-1" />
                <span>All planned items implemented for this module!</span>
              </div>
            ) : (
              module.missingItems.map((item) => {
                const isEditing = editingItemId === item.id;
                const isJustSent = justSentItemId === item.id;
                const linkedStatus = getLinkedTaskStatus(item);

                if (isEditing) {
                  return (
                    <div key={item.id} className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-brand-500/50 shadow-sm space-y-2 text-xs">
                      <input
                        type="text"
                        value={editingItemTitle}
                        onChange={(e) => setEditingItemTitle(e.target.value)}
                        className="w-full text-xs font-medium px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100"
                        placeholder="Missing feature or edge case..."
                        autoFocus
                      />
                      <textarea
                        rows={2}
                        value={editingItemDetails}
                        onChange={(e) => setEditingItemDetails(e.target.value)}
                        className="w-full text-[11px] px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
                        placeholder="Comments, notes, or implementation details..."
                      />
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={cancelEditingItem}
                          className="px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEditingItem(item)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition shadow-xs"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className="group flex flex-col gap-1 p-2 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-amber-500/40 transition text-xs shadow-xs"
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => handleMarkItemDone(item)}
                        className="mt-0.5 text-zinc-400 hover:text-emerald-500 transition shrink-0"
                        title="Mark Done"
                      >
                        <Circle className="w-4 h-4" />
                      </button>
                      <span className="flex-1 text-zinc-800 dark:text-zinc-200 font-medium leading-snug">
                        {item.title}
                      </span>

                      {/* Actions & Status for Missing Item */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Status Feedback: Sent Flash, Locked Badge, or Active To Board Button */}
                        {isJustSent ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 text-[10px] font-semibold flex items-center gap-1 animate-pulse">
                            <Check className="w-3 h-3" />
                            <span>Sent to Board!</span>
                          </span>
                        ) : linkedStatus ? (
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-medium flex items-center gap-1 cursor-default ${linkedStatus.color}`}
                            title="Locked: This deliverable is already on the board and synced bidirectionally"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            <span>{linkedStatus.label}</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendToBoard(item)}
                            className="px-2 py-0.5 rounded-md bg-brand-500/10 hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-500/25 transition text-[10px] font-medium flex items-center gap-1"
                            title="Promote this missing item to Headroom Kanban Focus Board"
                          >
                            <Send className="w-2.5 h-2.5" />
                            <span>To Board</span>
                          </button>
                        )}

                        <button
                          onClick={() => startEditingItem(item)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition p-0.5"
                          title="Edit Title & Comments"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteItem(item.id, false)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition p-0.5"
                          title="Delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Display comments/details if any */}
                    {item.details && (
                      <div className="ml-6 mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-100/70 dark:bg-zinc-800/50 px-2 py-1 rounded-md border border-zinc-200/50 dark:border-zinc-700/50 flex items-start gap-1.5">
                        <MessageSquare className="w-3 h-3 text-brand-500 shrink-0 mt-0.5" />
                        <span className="italic leading-relaxed">{item.details}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick add to Missing Scope */}
          <form onSubmit={handleAddMissingItem} className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-1.5">
            <input
              type="text"
              value={newMissingTitle}
              onChange={(e) => setNewMissingTitle(e.target.value)}
              placeholder="+ Add missing spec, edge case, or task..."
              className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-zinc-400"
            />
            {newMissingTitle.trim() && (
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-500 transition shadow-xs"
              >
                Add
              </button>
            )}
          </form>
        </div>

      </div>

      {/* Footer Notes if any */}
      {module.notes && (
        <div className="px-4 py-2 bg-zinc-100/60 dark:bg-zinc-900/40 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
          <Tag className="w-3 h-3 text-zinc-400 shrink-0" />
          <span className="truncate italic">{module.notes}</span>
        </div>
      )}
    </div>
  );
};
