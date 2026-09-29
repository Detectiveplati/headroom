import React, { useEffect, useState } from 'react';
import { Handle, Position, NodeProps, NodeResizer, Node, useStore } from '@xyflow/react';
import { Check } from 'lucide-react';
import { Task } from '../../types';
import { MODULE_WIDTH, MAP_GRID, ModuleProgress } from '../../utils/projectMap';

export interface ModuleNodeData extends Record<string, unknown> {
  title: string;
  color: string;
  progress: ModuleProgress;
  openTasks: Task[];
  onToggleManualDone: () => void;
}

export interface TextNodeData extends Record<string, unknown> {
  title: string;
  onRename: (title: string) => void;
}

export type ModuleFlowNode = Node<ModuleNodeData, 'module'>;
export type NoteFlowNode = Node<TextNodeData, 'note'>;
export type FrameFlowNode = Node<TextNodeData, 'frame'>;

// Handles on every side, all "source": the canvas runs in loose mode so any side joins any side
const SideHandles: React.FC = () => (
  <>
    <Handle id="t" type="source" position={Position.Top} className="map-handle" />
    <Handle id="r" type="source" position={Position.Right} className="map-handle" />
    <Handle id="b" type="source" position={Position.Bottom} className="map-handle" />
    <Handle id="l" type="source" position={Position.Left} className="map-handle" />
  </>
);

const zoomSelector = (s: { transform: [number, number, number] }) => s.transform[2];

export const ModuleNode: React.FC<NodeProps<ModuleFlowNode>> = ({ data, selected }) => {
  const zoom = useStore(zoomSelector);
  const { done, total, isDone } = data.progress;
  const pct = total > 0 ? Math.round((done / total) * 100) : isDone ? 100 : 0;
  const showTasks = zoom >= 1.1 && data.openTasks.length > 0;

  return (
    <div
      style={{ width: MODULE_WIDTH, borderTopColor: data.color }}
      className={`rounded-xl border border-t-4 bg-offwhite-card dark:bg-[#151821] shadow-sm transition-shadow ${
        selected ? 'border-brand-500 ring-2 ring-brand-500/40 shadow-md' : 'border-zinc-300/80 dark:border-zinc-700/80'
      } ${isDone ? 'opacity-80' : ''}`}
    >
      <SideHandles />
      <div className="p-2.5 space-y-2">
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (total === 0) data.onToggleManualDone();
            }}
            title={total > 0 ? 'Done when every task is ticked' : 'Mark module done'}
            className={`nodrag mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center transition ${
              isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-400 dark:border-zinc-600'
            } ${total > 0 ? 'cursor-default' : 'hover:border-emerald-500'}`}
          >
            {isDone && <Check className="w-3 h-3" />}
          </button>
          <span className={`text-xs font-semibold leading-snug text-zinc-900 dark:text-zinc-100 ${isDone ? 'line-through decoration-zinc-400' : ''}`}>
            {data.title || 'Untitled module'}
          </span>
        </div>

        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
            {total > 0 ? `${done}/${total} tasks` : isDone ? 'Done' : 'No tasks yet'}
          </div>
        </div>

        {showTasks && (
          <ul className="space-y-0.5 border-t border-zinc-200 dark:border-zinc-800 pt-1.5">
            {data.openTasks.slice(0, 4).map((t) => (
              <li key={t.id} className="text-[10px] text-zinc-600 dark:text-zinc-400 truncate">
                ○ {t.title}
              </li>
            ))}
            {data.openTasks.length > 4 && (
              <li className="text-[10px] text-zinc-400">+{data.openTasks.length - 4} more</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

/** Double-click to edit; commits on blur or Enter (Shift+Enter for a new line). */
function useInlineEdit(title: string, onRename: (title: string) => void) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  useEffect(() => {
    if (!isEditing) setDraft(title);
  }, [title, isEditing]);
  const commit = () => {
    setIsEditing(false);
    if (draft.trim() !== title) onRename(draft.trim());
  };
  return { isEditing, draft, setDraft, start: () => setIsEditing(true), commit, cancel: () => setIsEditing(false) };
}

export const NoteNode: React.FC<NodeProps<NoteFlowNode>> = ({ data, selected }) => {
  const edit = useInlineEdit(data.title, data.onRename);
  return (
    <div
      onDoubleClick={edit.start}
      className={`w-full h-full min-w-[120px] min-h-[48px] rounded-lg bg-amber-100 dark:bg-amber-900/40 border shadow-sm p-2.5 ${
        selected ? 'border-amber-500 ring-2 ring-amber-500/40' : 'border-amber-300 dark:border-amber-700/60'
      }`}
      style={{ maxWidth: MAP_GRID * 12 }}
    >
      <SideHandles />
      {edit.isEditing ? (
        <textarea
          autoFocus
          value={edit.draft}
          onChange={(e) => edit.setDraft(e.target.value)}
          onBlur={edit.commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              edit.commit();
            } else if (e.key === 'Escape') {
              edit.cancel();
            }
          }}
          rows={3}
          className="nodrag w-full text-xs bg-transparent text-amber-950 dark:text-amber-100 focus:outline-none resize-none"
        />
      ) : (
        <p className="text-xs text-amber-950 dark:text-amber-100 whitespace-pre-wrap leading-snug">
          {data.title || 'Double-click to write…'}
        </p>
      )}
    </div>
  );
};

export interface FrameNodeExtra {
  onResized: (size: { x: number; y: number; width: number; height: number }) => void;
}

export const FrameNode: React.FC<NodeProps<Node<TextNodeData & FrameNodeExtra, 'frame'>>> = ({ data, selected }) => {
  const edit = useInlineEdit(data.title, data.onRename);
  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={MAP_GRID * 6}
        minHeight={MAP_GRID * 4}
        lineClassName="!border-brand-500"
        handleClassName="!bg-brand-500 !border-white"
        onResizeEnd={(_, p) => data.onResized({ x: p.x, y: p.y, width: p.width, height: p.height })}
      />
      <div
        className={`w-full h-full rounded-2xl border-2 border-dashed bg-zinc-500/[0.04] dark:bg-white/[0.02] ${
          selected ? 'border-brand-500/70' : 'border-zinc-300 dark:border-zinc-700'
        }`}
      >
        <div onDoubleClick={edit.start} className="px-3 py-1.5">
          {edit.isEditing ? (
            <input
              autoFocus
              value={edit.draft}
              onChange={(e) => edit.setDraft(e.target.value)}
              onBlur={edit.commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') edit.commit();
                else if (e.key === 'Escape') edit.cancel();
              }}
              className="nodrag text-xs font-bold uppercase tracking-wider bg-transparent text-zinc-700 dark:text-zinc-300 focus:outline-none"
            />
          ) : (
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 select-none">
              {data.title || 'Frame'}
            </span>
          )}
        </div>
      </div>
    </>
  );
};
