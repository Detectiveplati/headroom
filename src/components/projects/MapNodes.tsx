import React, { useEffect, useState } from 'react';
import { Handle, Position, NodeProps, NodeResizer, NodeToolbar, Node, useStore } from '@xyflow/react';
import { Check, X } from 'lucide-react';
import { Task, MapColor } from '../../types';
import { MODULE_WIDTH, MAP_GRID, MAP_COLORS, ModuleProgress, mapColorHex } from '../../utils/projectMap';

interface ColorableData {
  colorKey?: MapColor;
  onSetColor: (color: MapColor | undefined) => void;
}

export interface ModuleNodeData extends Record<string, unknown>, ColorableData {
  title: string;
  // Project colour, used when the box has no category colour
  color: string;
  progress: ModuleProgress;
  openTasks: Task[];
  onToggleManualDone: () => void;
}

export interface TextNodeData extends Record<string, unknown>, ColorableData {
  title: string;
  onRename: (title: string) => void;
}

/** Colour swatches shown above the selected box. */
const ColorToolbar: React.FC<ColorableData & { isVisible: boolean }> = ({ isVisible, colorKey, onSetColor }) => (
  <NodeToolbar isVisible={isVisible} offset={8}>
    <div className="nodrag flex items-center gap-1 px-1.5 py-1 rounded-full bg-offwhite-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-md">
      {MAP_COLORS.map((c) => (
        <button
          key={c.key}
          onClick={() => onSetColor(c.key)}
          title={c.label}
          className={`h-5 w-5 rounded-full transition hover:scale-110 ${colorKey === c.key ? 'ring-2 ring-offset-1 ring-zinc-900 dark:ring-white dark:ring-offset-zinc-900' : ''}`}
          style={{ backgroundColor: c.hex }}
        />
      ))}
      <button
        onClick={() => onSetColor(undefined)}
        title="No colour"
        className={`h-5 w-5 rounded-full border border-zinc-300 dark:border-zinc-600 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 ${!colorKey ? 'ring-2 ring-offset-1 ring-zinc-900 dark:ring-white dark:ring-offset-zinc-900' : ''}`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  </NodeToolbar>
);

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
  const category = mapColorHex(data.colorKey);

  return (
    <div
      style={{
        width: MODULE_WIDTH,
        borderTopColor: category ?? data.color,
        // Category tint layered over the card background so light and dark themes both work
        backgroundImage: category ? `linear-gradient(${category}1f, ${category}1f)` : undefined,
        borderColor: category && !selected ? `${category}80` : undefined,
      }}
      className={`rounded-xl border border-t-4 bg-offwhite-card dark:bg-[#151821] shadow-sm transition-shadow ${
        selected ? 'border-brand-500 ring-2 ring-brand-500/40 shadow-md' : 'border-zinc-300/80 dark:border-zinc-700/80'
      } ${isDone ? 'opacity-80' : ''}`}
    >
      <ColorToolbar isVisible={!!selected} colorKey={data.colorKey} onSetColor={data.onSetColor} />
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
  const noteColor = mapColorHex(data.colorKey);
  return (
    <div
      onDoubleClick={edit.start}
      className={`w-full h-full min-w-[120px] min-h-[48px] rounded-lg bg-amber-100 dark:bg-amber-900/40 border shadow-sm p-2.5 ${
        selected ? 'border-amber-500 ring-2 ring-amber-500/40' : 'border-amber-300 dark:border-amber-700/60'
      }`}
      style={{
        maxWidth: MAP_GRID * 12,
        // A category colour replaces the default yellow sticky
        ...(noteColor ? { backgroundColor: `${noteColor}33`, borderColor: noteColor } : {}),
      }}
    >
      <ColorToolbar isVisible={!!selected} colorKey={data.colorKey} onSetColor={data.onSetColor} />
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
  const frameColor = mapColorHex(data.colorKey);
  return (
    <>
      <ColorToolbar isVisible={!!selected} colorKey={data.colorKey} onSetColor={data.onSetColor} />
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
        style={frameColor ? { borderColor: selected ? undefined : `${frameColor}99`, backgroundColor: `${frameColor}0f` } : undefined}
      >
        <div onDoubleClick={edit.start} className="px-3 py-1.5" style={frameColor ? { color: frameColor } : undefined}>
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
            <span className={`text-xs font-bold uppercase tracking-wider select-none ${frameColor ? '' : 'text-zinc-500 dark:text-zinc-400'}`}>
              {data.title || 'Frame'}
            </span>
          )}
        </div>
      </div>
    </>
  );
};
