import React, { useEffect, useState } from 'react';
import {
  Handle,
  Position,
  NodeProps,
  NodeResizer,
  NodeToolbar,
  Node,
  Edge,
  EdgeProps,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
} from '@xyflow/react';
import { Check, X, Plus, PanelRightOpen, Trash2 } from 'lucide-react';
import { Task, MapColor, MapLinkStyle } from '../../types';
import { MODULE_WIDTH, MAP_GRID, MAP_COLORS, ModuleProgress, isTaskDone, mapColorHex } from '../../utils/projectMap';

interface ColorableData {
  colorKey?: MapColor;
  onSetColor: (color: MapColor | undefined) => void;
}

export interface ModuleNodeData extends Record<string, unknown>, ColorableData {
  title: string;
  // Project colour, used when the box has no category colour
  color: string;
  progress: ModuleProgress;
  tasks: Task[];
  // Set on a freshly added box so its title opens ready to type
  autoEdit: boolean;
  onRename: (title: string) => void;
  onOpenDetails: () => void;
  onAddTask: (title: string) => void;
  onToggleTask: (task: Task) => void;
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

// A new node stays hidden until React Flow has measured it, so autoFocus alone can miss;
// retry for a few frames. Module-level so React calls it once per mount.
function focusWhenShown(el: HTMLInputElement | null) {
  if (!el) return;
  let tries = 0;
  const attempt = () => {
    el.focus();
    if (document.activeElement !== el && ++tries < 10) requestAnimationFrame(attempt);
  };
  attempt();
}

/** Inline "Add task" row at the bottom of a box; stays open after Enter for quick lists. */
const BoxTaskInput: React.FC<{ onAdd: (title: string) => void }> = ({ onAdd }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const close = () => {
    setDraft('');
    setIsOpen(false);
  };
  const submit = () => {
    if (draft.trim()) onAdd(draft.trim());
    setDraft('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="nodrag w-full flex items-center gap-1 text-[10px] text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 transition"
      >
        <Plus className="w-3 h-3" /> Add task
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        submit();
        close();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submit();
        else if (e.key === 'Escape') close();
      }}
      placeholder="Task, then Enter"
      className="nodrag w-full text-[10px] px-1.5 py-1 rounded bg-offwhite-input dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
    />
  );
};

export const ModuleNode: React.FC<NodeProps<ModuleFlowNode>> = ({ data, selected }) => {
  const edit = useInlineEdit(data.title, data.onRename, data.autoEdit);
  const { done, total, isDone } = data.progress;
  const pct = total > 0 ? Math.round((done / total) * 100) : isDone ? 100 : 0;
  const category = mapColorHex(data.colorKey);
  // Every task, in full; open ones first so what is left to do leads
  const ordered = [...data.tasks.filter((t) => !isTaskDone(t)), ...data.tasks.filter(isTaskDone)];

  return (
    <div
      style={{
        width: MODULE_WIDTH,
        borderTopColor: category ?? data.color,
        // Category tint layered over the card background so light and dark themes both work
        backgroundImage: category ? `linear-gradient(${category}1f, ${category}1f)` : undefined,
        borderColor: category && !selected ? `${category}80` : undefined,
      }}
      className={`group rounded-xl border border-t-4 bg-offwhite-card dark:bg-[#151821] shadow-sm transition-shadow ${
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
          {edit.isEditing ? (
            <input
              ref={focusWhenShown}
              value={edit.draft}
              onChange={(e) => edit.setDraft(e.target.value)}
              onFocus={(e) => e.target.select()}
              onBlur={edit.commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') edit.commit();
                else if (e.key === 'Escape') edit.cancel();
              }}
              className="nodrag flex-1 min-w-0 text-xs font-semibold bg-transparent text-zinc-900 dark:text-zinc-100 border-b border-brand-500 focus:outline-none"
            />
          ) : (
            <span
              onClick={edit.start}
              title="Click to rename"
              className={`flex-1 min-w-0 text-xs font-semibold leading-snug text-zinc-900 dark:text-zinc-100 cursor-text break-words ${
                isDone ? 'line-through decoration-zinc-400' : ''
              }`}
            >
              {data.title || 'Untitled module'}
            </span>
          )}
          <button
            onClick={data.onOpenDetails}
            title="Open details (notes, board, delete)"
            className="nodrag -mr-1 -mt-0.5 p-0.5 rounded text-zinc-400 opacity-60 group-hover:opacity-100 hover:text-brand-600 hover:bg-brand-500/10 dark:hover:text-brand-400 transition"
          >
            <PanelRightOpen className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
            {total > 0 ? `${done}/${total} tasks` : isDone ? 'Done' : 'No tasks yet'}
          </div>
        </div>

        <div className="space-y-1 border-t border-zinc-200 dark:border-zinc-800 pt-1.5">
          {ordered.length > 0 && (
            <ul className="space-y-1">
              {ordered.map((t) => {
                const taskDone = isTaskDone(t);
                return (
                  <li key={t.id} className="flex items-start gap-1.5 min-w-0">
                    <button
                      onClick={() => data.onToggleTask(t)}
                      title={taskDone ? 'Mark not done' : 'Mark done'}
                      className={`nodrag mt-px h-3 w-3 shrink-0 rounded-sm border flex items-center justify-center transition ${
                        taskDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-400 dark:border-zinc-600 hover:border-emerald-500'
                      }`}
                    >
                      {taskDone && <Check className="w-2 h-2" />}
                    </button>
                    <span
                      className={`flex-1 min-w-0 text-[10px] leading-snug break-words ${
                        taskDone ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {t.title}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <BoxTaskInput onAdd={data.onAddTask} />
        </div>
      </div>
    </div>
  );
};

/** Inline title editing; commits on blur or Enter (Shift+Enter for a new line in notes). */
function useInlineEdit(title: string, onRename: (title: string) => void, startEditing = false) {
  const [isEditing, setIsEditing] = useState(startEditing);
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

export interface LinkEdgeData extends Record<string, unknown> {
  linkStyle: MapLinkStyle;
  onDelete: () => void;
}

export type LinkFlowEdge = Edge<LinkEdgeData, 'link'>;

/** A line between boxes: click to select it, then its bin button (or Delete) removes it. */
export const LinkEdge: React.FC<EdgeProps<LinkFlowEdge>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
  selected,
  data,
}) => {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const isBlocks = data?.linkStyle === 'blocks';
  const baseWidth = Number(style?.strokeWidth) || 1.5;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={24}
        style={selected ? { ...style, strokeWidth: baseWidth + 1.5, filter: 'drop-shadow(0 0 3px rgba(94, 106, 210, 0.7))' } : style}
      />
      {(label || selected) && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute flex items-center gap-1"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'all' }}
          >
            {label && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] bg-offwhite-surface/90 dark:bg-zinc-900/90 ${
                  isBlocks ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {label}
              </span>
            )}
            {selected && data && (
              <button
                onClick={data.onDelete}
                title="Delete line (Delete)"
                className="p-1 rounded-full bg-offwhite-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-md text-zinc-500 hover:text-red-500 hover:border-red-400 transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
