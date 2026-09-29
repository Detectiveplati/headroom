import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  Connection,
  ConnectionMode,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  OnBeforeDelete,
  OnNodeDrag,
  OnConnectEnd,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, StickyNote, Frame, Magnet, Maximize2, Undo2, Redo2 } from 'lucide-react';
import { Project, Task, MapNode, MapLink, MapNodeKind, MapColor } from '../../types';
import { MAP_GRID, MODULE_WIDTH, LINK_STYLES, groupTasksByModule, getModuleProgress, isInsideFrame, makeId, mapColorHex } from '../../utils/projectMap';
import { ModuleNode, NoteNode, FrameNode, LinkEdge, LinkFlowEdge } from './MapNodes';

const NODE_TYPES = { module: ModuleNode, note: NoteNode, frame: FrameNode };
const EDGE_TYPES = { link: LinkEdge };

interface ProjectCanvasProps {
  project: Project;
  tasks: Task[];
  // Module whose details panel is open
  selectedNodeId: string | null;
  focusNodeId: string | null;
  onFocusHandled: () => void;
  onSelectModule: (nodeId: string | null) => void;
  onUpdateProject: (update: (p: Project) => Project) => void;
  onAddModuleTasks: (nodeId: string, titles: string[]) => void;
  onToggleTaskDone: (task: Task) => void;
  // Unset when there is nothing to undo / redo
  onUndo?: () => void;
  onRedo?: () => void;
}

function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Used until React Flow has measured a box
const FALLBACK_BOX_HEIGHT = MAP_GRID * 5;

/**
 * Lines attach on the sides that face each other: a box wholly above or below joins
 * bottom-to-top (so a parent's lines fan out like a tree instead of crossing), boxes
 * side by side join left-to-right, and overlapping boxes go by which way is further.
 */
function facingHandles(from: Box | undefined, to: Box | undefined): [string, string] {
  if (!from || !to) return ['r', 'l'];
  const below = to.y - (from.y + from.h);
  const above = from.y - (to.y + to.h);
  if (below > 0) return ['b', 't'];
  if (above > 0) return ['t', 'b'];
  const right = to.x - (from.x + from.w);
  const left = from.x - (to.x + to.w);
  if (right > 0) return ['r', 'l'];
  if (left > 0) return ['l', 'r'];
  const dx = to.x + to.w / 2 - (from.x + from.w / 2);
  const dy = to.y + to.h / 2 - (from.y + from.h / 2);
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? ['r', 'l'] : ['l', 'r'];
  return dy >= 0 ? ['b', 't'] : ['t', 'b'];
}

function edgeFromLink(link: MapLink, boxes: Map<string, Box>, onDelete: () => void): LinkFlowEdge {
  const isBlocks = link.style === 'blocks';
  const stroke = isBlocks ? '#ef4444' : '#94a3b8';
  const [sourceHandle, targetHandle] = facingHandles(boxes.get(link.fromNodeId), boxes.get(link.toNodeId));
  return {
    id: link.id,
    type: 'link',
    source: link.fromNodeId,
    target: link.toNodeId,
    sourceHandle,
    targetHandle,
    label: link.label,
    style: { stroke, strokeWidth: isBlocks ? 2 : 1.5, strokeDasharray: link.style === 'dashed' ? '6 4' : undefined },
    markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
    data: { linkStyle: link.style, onDelete },
  };
}

const CanvasInner: React.FC<ProjectCanvasProps> = ({
  project,
  tasks,
  selectedNodeId,
  focusNodeId,
  onFocusHandled,
  onSelectModule,
  onUpdateProject,
  onAddModuleTasks,
  onToggleTaskDone,
  onUndo,
  onRedo,
}) => {
  const flow = useReactFlow();
  const isDark = useIsDarkMode();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [snapOn, setSnapOn] = useState(true);
  const [altHeld, setAltHeld] = useState(false);
  // The module just added from the toolbar opens with its title ready to type
  const [autoEditNodeId, setAutoEditNodeId] = useState<string | null>(null);
  // Nodes that ride along while a frame is dragged: id -> position at drag start
  const frameDragRef = useRef<{ frameStart: { x: number; y: number }; children: Map<string, { x: number; y: number }> } | null>(null);

  // Hold Alt while dragging for fine placement. Pointer events carry the live Alt state,
  // so a missed keyup (e.g. Alt+3 tab switch) can't leave snapping off.
  useEffect(() => {
    const onInput = (e: KeyboardEvent | PointerEvent) => setAltHeld(e.altKey);
    const onBlur = () => setAltHeld(false);
    window.addEventListener('keydown', onInput);
    window.addEventListener('keyup', onInput);
    window.addEventListener('pointerdown', onInput, true);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onInput);
      window.removeEventListener('keyup', onInput);
      window.removeEventListener('pointerdown', onInput, true);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const renameNode = useCallback(
    (nodeId: string, title: string) =>
      onUpdateProject((p) => ({ ...p, nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, title } : n)) })),
    [onUpdateProject]
  );

  const setNodeColor = useCallback(
    (nodeId: string, color: MapColor | undefined) =>
      onUpdateProject((p) => ({ ...p, nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, color } : n)) })),
    [onUpdateProject]
  );

  const toggleNodeLock = useCallback(
    (nodeId: string) =>
      onUpdateProject((p) => ({ ...p, nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, isLocked: !n.isLocked || undefined } : n)) })),
    [onUpdateProject]
  );

  // Derived flow nodes; local state only carries in-progress drags and selection
  const derivedNodes = useMemo<Node[]>(() => {
    const byModule = groupTasksByModule(tasks, project.id);
    return project.nodes.map((n): Node => {
      // Locked boxes stay put: React Flow won't drag or keyboard-delete them
      const base = {
        id: n.id,
        position: { x: n.x, y: n.y },
        selected: n.id === selectedNodeId,
        draggable: !n.isLocked,
        deletable: !n.isLocked,
      };
      const toolbarProps = {
        colorKey: n.color,
        onSetColor: (color: MapColor | undefined) => setNodeColor(n.id, color),
        isLocked: !!n.isLocked,
        onToggleLock: () => toggleNodeLock(n.id),
      };
      if (n.kind === 'frame') {
        return {
          ...base,
          type: 'frame',
          zIndex: -1,
          style: { width: n.width ?? MAP_GRID * 12, height: n.height ?? MAP_GRID * 10 },
          data: {
            ...toolbarProps,
            title: n.title,
            onRename: (title: string) => renameNode(n.id, title),
            onResized: (s: { x: number; y: number; width: number; height: number }) =>
              onUpdateProject((p) => ({ ...p, nodes: p.nodes.map((x) => (x.id === n.id ? { ...x, ...s } : x)) })),
          },
        };
      }
      if (n.kind === 'note') {
        return { ...base, type: 'note', data: { ...toolbarProps, title: n.title, onRename: (title: string) => renameNode(n.id, title) } };
      }
      const moduleTasks = byModule.get(n.id) || [];
      return {
        ...base,
        type: 'module',
        data: {
          ...toolbarProps,
          title: n.title,
          color: project.color,
          progress: getModuleProgress(n, moduleTasks),
          tasks: moduleTasks,
          autoEdit: n.id === autoEditNodeId,
          onRename: (title: string) => renameNode(n.id, title),
          onOpenDetails: () => onSelectModule(n.id),
          onAddTask: (title: string) => onAddModuleTasks(n.id, [title]),
          onToggleTask: onToggleTaskDone,
          onToggleManualDone: () =>
            onUpdateProject((p) => ({
              ...p,
              nodes: p.nodes.map((x) => (x.id === n.id ? { ...x, isDoneManual: !x.isDoneManual || undefined } : x)),
            })),
        },
      };
    });
  }, [
    project,
    tasks,
    selectedNodeId,
    autoEditNodeId,
    renameNode,
    setNodeColor,
    toggleNodeLock,
    onUpdateProject,
    onSelectModule,
    onAddModuleTasks,
    onToggleTaskDone,
  ]);

  // Rebuilds keep the canvas selection (e.g. after picking a colour or ticking a task) so
  // toolbars stay open, and keep the measured size so React Flow doesn't hide the box to
  // re-measure it. The module with its panel open is always selected.
  const [nodes, setNodes] = useState<Node[]>(derivedNodes);
  useEffect(
    () =>
      setNodes((prev) => {
        const prevById = new Map(prev.map((n) => [n.id, n]));
        return derivedNodes.map((n) => {
          const old = prevById.get(n.id);
          return old ? { ...n, measured: old.measured, selected: n.selected || old.selected } : n;
        });
      }),
    [derivedNodes]
  );

  const deleteLink = useCallback(
    (linkId: string) => onUpdateProject((p) => ({ ...p, links: p.links.filter((l) => l.id !== linkId) })),
    [onUpdateProject]
  );

  // Measured box sizes as a string, so lines only re-route when a box changes size
  // (e.g. a task is added), not on every frame of a drag
  const sizeKey = useMemo(
    () => nodes.map((n) => `${n.id}:${n.measured?.width ?? ''}:${n.measured?.height ?? ''}`).join('|'),
    [nodes]
  );

  const derivedEdges = useMemo(() => {
    const measured = new Map(
      sizeKey.split('|').map((entry): [string, { w: number; h: number }] => {
        const [id, w, h] = entry.split(':');
        return [id, { w: Number(w), h: Number(h) }];
      })
    );
    // Positions come from the saved project, so lines settle when a drag ends
    const boxes = new Map<string, Box>(
      project.nodes.map((n) => {
        const size = measured.get(n.id);
        return [
          n.id,
          {
            x: n.x,
            y: n.y,
            w: size?.w || n.width || MODULE_WIDTH,
            h: size?.h || n.height || FALLBACK_BOX_HEIGHT,
          },
        ];
      })
    );
    return project.links.map((l) => edgeFromLink(l, boxes, () => deleteLink(l.id)));
  }, [project.links, project.nodes, sizeKey, deleteLink]);

  // Lines are selectable like nodes: click one to show its delete button
  const [edges, setEdges] = useState<Edge[]>(derivedEdges);
  useEffect(
    () =>
      setEdges((prev) => {
        const wasSelected = new Set(prev.filter((e) => e.selected).map((e) => e.id));
        return derivedEdges.map((e) => (wasSelected.has(e.id) ? { ...e, selected: true } : e));
      }),
    [derivedEdges]
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((prev) => applyNodeChanges(changes, prev));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((prev) => applyEdgeChanges(changes, prev));
  }, []);

  const onNodeDragStart: OnNodeDrag = useCallback(
    (_, node) => {
      const frame = project.nodes.find((n) => n.id === node.id && n.kind === 'frame');
      if (!frame) {
        frameDragRef.current = null;
        return;
      }
      const children = new Map<string, { x: number; y: number }>();
      project.nodes.forEach((n) => {
        if (n.id !== frame.id && n.kind !== 'frame' && !n.isLocked && isInsideFrame(n, frame)) children.set(n.id, { x: n.x, y: n.y });
      });
      frameDragRef.current = { frameStart: { x: frame.x, y: frame.y }, children };
    },
    [project.nodes]
  );

  const onNodeDrag: OnNodeDrag = useCallback((_, node) => {
    const drag = frameDragRef.current;
    if (!drag) return;
    const dx = node.position.x - drag.frameStart.x;
    const dy = node.position.y - drag.frameStart.y;
    setNodes((prev) =>
      prev.map((n) => {
        const start = drag.children.get(n.id);
        return start ? { ...n, position: { x: start.x + dx, y: start.y + dy } } : n;
      })
    );
  }, []);

  // Positions are saved once, on drag end
  const onNodeDragStop: OnNodeDrag = useCallback(
    (_, node, dragged) => {
      const moved = new Map<string, { x: number; y: number }>();
      dragged.forEach((n) => moved.set(n.id, n.position));
      moved.set(node.id, node.position);
      const drag = frameDragRef.current;
      if (drag) {
        const dx = node.position.x - drag.frameStart.x;
        const dy = node.position.y - drag.frameStart.y;
        drag.children.forEach((start, id) => moved.set(id, { x: start.x + dx, y: start.y + dy }));
      }
      frameDragRef.current = null;
      onUpdateProject((p) => ({
        ...p,
        nodes: p.nodes.map((n) => {
          const pos = moved.get(n.id);
          return pos ? { ...n, x: Math.round(pos.x), y: Math.round(pos.y) } : n;
        }),
      }));
    },
    [onUpdateProject]
  );

  // Sides are left unset so every line attaches where the two boxes face each other,
  // and re-routes as boxes move.
  const addLink = useCallback(
    (fromNodeId: string, toNodeId: string) => {
      if (fromNodeId === toNodeId) return;
      onUpdateProject((p) => {
        if (p.links.some((l) => l.fromNodeId === fromNodeId && l.toNodeId === toNodeId)) return p;
        const link: MapLink = { id: makeId('link'), fromNodeId, toNodeId, style: 'plain' };
        return { ...p, links: [...p.links, link] };
      });
    },
    [onUpdateProject]
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source && c.target) addLink(c.source, c.target);
    },
    [addLink]
  );

  // Dropping a line anywhere on another box connects to it; no need to hit its small dot
  const onConnectEnd: OnConnectEnd = useCallback(
    (event, state) => {
      if (state.isValid || !state.fromNode) return;
      const point = 'changedTouches' in event ? event.changedTouches[0] : event;
      if (!point) return;
      const target = document
        .elementsFromPoint(point.clientX, point.clientY)
        .map((el) => el.closest<HTMLElement>('.react-flow__node'))
        .find((el) => el && el.dataset.id !== state.fromNode?.id && !el.classList.contains('react-flow__node-frame'));
      const toNodeId = target?.dataset.id;
      if (toNodeId) addLink(state.fromNode.id, toNodeId);
    },
    [addLink]
  );

  // Keyboard delete removes lines, notes and frames; modules are deleted from their panel
  // so the user can choose what happens to their cards.
  const onBeforeDelete: OnBeforeDelete = useCallback(async ({ nodes: delNodes, edges: delEdges }) => {
    const deletable = delNodes.filter((n) => n.type !== 'module');
    return { nodes: deletable, edges: delEdges };
  }, []);

  const onDelete = useCallback(
    ({ nodes: delNodes, edges: delEdges }: { nodes: Node[]; edges: Edge[] }) => {
      const nodeIds = new Set(delNodes.map((n) => n.id));
      const edgeIds = new Set(delEdges.map((e) => e.id));
      onUpdateProject((p) => ({
        ...p,
        nodes: p.nodes.filter((n) => !nodeIds.has(n.id)),
        links: p.links.filter((l) => !edgeIds.has(l.id) && !nodeIds.has(l.fromNodeId) && !nodeIds.has(l.toNodeId)),
      }));
    },
    [onUpdateProject]
  );

  const updateLink = useCallback(
    (linkId: string, update: (l: MapLink) => MapLink) =>
      onUpdateProject((p) => ({ ...p, links: p.links.map((l) => (l.id === linkId ? update(l) : l)) })),
    [onUpdateProject]
  );

  const addNode = (kind: MapNodeKind) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    const center = flow.screenToFlowPosition({
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
    });
    const snap = (v: number) => Math.round(v / MAP_GRID) * MAP_GRID;
    const node: MapNode = {
      id: makeId('node'),
      kind,
      title: kind === 'module' ? 'New module' : kind === 'frame' ? 'New frame' : '',
      x: snap(center.x - (kind === 'frame' ? MAP_GRID * 8 : MAP_GRID * 4)),
      y: snap(center.y - MAP_GRID * 2),
      ...(kind === 'frame' ? { width: MAP_GRID * 16, height: MAP_GRID * 10 } : {}),
    };
    onUpdateProject((p) => ({ ...p, nodes: [...p.nodes, node] }));
    if (kind === 'module') setAutoEditNodeId(node.id);
  };

  // Centre on a module when arriving from a board card's "Open in map"
  useEffect(() => {
    if (!focusNodeId) return;
    const node = project.nodes.find((n) => n.id === focusNodeId);
    if (node) {
      flow.setCenter(node.x + MAP_GRID * 4, node.y + MAP_GRID * 2, { zoom: 1.2, duration: 400 });
      onSelectModule(node.id);
    }
    onFocusHandled();
  }, [focusNodeId, project.nodes, flow, onSelectModule, onFocusHandled]);

  const toolButton =
    'px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition border';
  const idleTool =
    'bg-offwhite-surface dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800';

  return (
    <div ref={wrapperRef} className="absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={() => onSelectModule(null)}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        connectionRadius={36}
        onBeforeDelete={onBeforeDelete}
        onDelete={onDelete}
        onEdgeDoubleClick={(_, edge) => {
          const link = project.links.find((l) => l.id === edge.id);
          if (!link) return;
          const label = window.prompt('Line label (leave empty for none)', link.label || '');
          if (label !== null) updateLink(link.id, (l) => ({ ...l, label: label.trim() || undefined }));
        }}
        onEdgeContextMenu={(e, edge) => {
          e.preventDefault();
          updateLink(edge.id, (l) => ({ ...l, style: LINK_STYLES[(LINK_STYLES.indexOf(l.style) + 1) % LINK_STYLES.length] }));
        }}
        connectionMode={ConnectionMode.Loose}
        snapToGrid={snapOn && !altHeld}
        snapGrid={[MAP_GRID, MAP_GRID]}
        colorMode={isDark ? 'dark' : 'light'}
        minZoom={0.15}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background variant={BackgroundVariant.Dots} gap={MAP_GRID} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="!hidden sm:!block" nodeColor={(n) => {
            const category = mapColorHex((n.data as { colorKey?: MapColor }).colorKey);
            if (n.type === 'frame') return category ? `${category}33` : 'transparent';
            return category ?? (n.type === 'note' ? '#fcd34d' : project.color);
          }} />
        <Panel position="top-left" className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => addNode('module')} className={`${toolButton} bg-brand-600 hover:bg-brand-500 border-brand-600 text-white`}>
            <Plus className="w-3.5 h-3.5" /> Module
          </button>
          <button onClick={() => addNode('note')} className={`${toolButton} ${idleTool}`}>
            <StickyNote className="w-3.5 h-3.5 text-amber-500" /> Note
          </button>
          <button onClick={() => addNode('frame')} className={`${toolButton} ${idleTool}`}>
            <Frame className="w-3.5 h-3.5" /> Frame
          </button>
          <button
            onClick={() => setSnapOn((s) => !s)}
            title="Snap to grid (hold Alt while dragging to place freely)"
            className={`${toolButton} ${snapOn ? 'bg-brand-500/15 border-brand-500/40 text-brand-700 dark:text-brand-300' : idleTool}`}
          >
            <Magnet className="w-3.5 h-3.5" /> Snap
          </button>
          <button onClick={() => flow.fitView({ padding: 0.15, duration: 300 })} className={`${toolButton} ${idleTool}`} title="Fit everything in view">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onUndo} disabled={!onUndo} className={`${toolButton} ${idleTool} disabled:opacity-40 disabled:pointer-events-none`} title="Undo (Ctrl+Z)">
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onRedo} disabled={!onRedo} className={`${toolButton} ${idleTool} disabled:opacity-40 disabled:pointer-events-none`} title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </Panel>
        <Panel position="bottom-right" className="!mb-2 hidden md:block text-[10px] text-zinc-400 dark:text-zinc-500 bg-offwhite-surface/80 dark:bg-zinc-900/80 px-2 py-1 rounded-md">
          Click a title to rename · drag from a box’s edge dot onto another box to link them · click a line to delete it · double-click to label · right-click to cycle plain / dashed / blocks
        </Panel>
      </ReactFlow>
    </div>
  );
};

export const ProjectCanvas: React.FC<ProjectCanvasProps> = (props) => (
  <ReactFlowProvider>
    <CanvasInner {...props} />
  </ReactFlowProvider>
);
