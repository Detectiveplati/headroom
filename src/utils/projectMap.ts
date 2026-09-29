import { Task, Project, MapNode, MapLink, MapNodeKind, MapLinkStyle, MapColor } from '../types';

// Canvas grid size in px. Seed files express positions in grid cells.
export const MAP_GRID = 24;
export const MODULE_WIDTH = MAP_GRID * 7;

const NODE_KINDS: MapNodeKind[] = ['module', 'note', 'frame'];
export const LINK_STYLES: MapLinkStyle[] = ['plain', 'dashed', 'blocks'];
export const HANDLE_IDS = ['t', 'r', 'b', 'l'];

// One clear hue per category, so boxes are easy to tell apart at a glance
export const MAP_COLORS: { key: MapColor; label: string; hex: string }[] = [
  { key: 'red', label: 'Red', hex: '#ef4444' },
  { key: 'orange', label: 'Orange', hex: '#f97316' },
  { key: 'yellow', label: 'Yellow', hex: '#eab308' },
  { key: 'green', label: 'Green', hex: '#22c55e' },
  { key: 'blue', label: 'Blue', hex: '#3b82f6' },
  { key: 'purple', label: 'Purple', hex: '#a855f7' },
];

export function mapColorHex(color: MapColor | undefined): string | undefined {
  return MAP_COLORS.find((c) => c.key === color)?.hex;
}

export const PROJECT_COLORS =['#6366f1', '#EA580C', '#10b981', '#0ea5e9', '#ec4899', '#f59e0b', '#8b5cf6', '#14b8a6'];

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ==================== DEFENSIVE PARSING HELPERS ====================
type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RawRecord) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback;
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function optionalStr(value: unknown): string | undefined {
  const s = str(value).trim();
  return s ? s : undefined;
}

// ==================== TASK HELPERS ====================
export function isTaskDone(task: Task): boolean {
  return task.columnId === 'done';
}

export function createMapTask(projectId: string, nodeId: string, title: string, done = false): Task {
  const now = Date.now();
  return {
    id: makeId('task'),
    title: title.trim(),
    columnId: done ? 'done' : 'backlog',
    priority: 'medium',
    context: 'work',
    subtasks: [],
    tags: [],
    elapsedSeconds: 0,
    isRunning: false,
    createdAt: now,
    completedAt: done ? now : undefined,
    linkedProjectId: projectId,
    linkedModuleId: nodeId,
    isOnBoard: false,
  };
}

/** Ticking on the map and completing on the board are the same write: the Done column. */
export function setTaskDone(task: Task, done: boolean): Task {
  if (done) {
    return { ...task, columnId: 'done', isRunning: false, completedAt: Date.now() };
  }
  return { ...task, columnId: 'backlog', completedAt: undefined };
}

/** Taking a card off the board parks it in the backlog so it never hides in Doing (WIP limit). */
export function setTaskOnBoard(task: Task, onBoard: boolean): Task {
  if (onBoard) return { ...task, isOnBoard: true };
  const columnId = task.columnId === 'done' ? 'done' : 'backlog';
  return { ...task, isOnBoard: false, isRunning: false, columnId };
}

/** Tasks of each module in a project, oldest first. */
export function groupTasksByModule(tasks: Task[], projectId: string): Map<string, Task[]> {
  const byModule = new Map<string, Task[]>();
  tasks.forEach((t) => {
    if (t.linkedProjectId !== projectId || !t.linkedModuleId) return;
    const list = byModule.get(t.linkedModuleId);
    if (list) list.push(t);
    else byModule.set(t.linkedModuleId, [t]);
  });
  byModule.forEach((list) => list.sort((a, b) => a.createdAt - b.createdAt));
  return byModule;
}

export interface ModuleProgress {
  done: number;
  total: number;
  isDone: boolean;
}

export function getModuleProgress(node: MapNode, moduleTasks: Task[] = []): ModuleProgress {
  const total = moduleTasks.length;
  const done = moduleTasks.filter(isTaskDone).length;
  return { done, total, isDone: total > 0 ? done === total : !!node.isDoneManual };
}

export interface ProjectProgress {
  doneModules: number;
  totalModules: number;
  doneTasks: number;
  totalTasks: number;
  percentage: number;
}

export function getProjectProgress(project: Project, tasks: Task[]): ProjectProgress {
  const byModule = groupTasksByModule(tasks, project.id);
  let doneModules = 0;
  let totalModules = 0;
  let doneTasks = 0;
  let totalTasks = 0;
  project.nodes.forEach((node) => {
    if (node.kind !== 'module') return;
    const progress = getModuleProgress(node, byModule.get(node.id));
    totalModules++;
    if (progress.isDone) doneModules++;
    doneTasks += progress.done;
    totalTasks += progress.total;
  });
  return {
    doneModules,
    totalModules,
    doneTasks,
    totalTasks,
    percentage: totalModules > 0 ? Math.round((doneModules / totalModules) * 100) : 0,
  };
}

// ==================== NORMALIZATION & LEGACY MIGRATION ====================
function normalizeNode(raw: unknown): MapNode | null {
  const n = asRecord(raw);
  if (!n || !str(n.id)) return null;
  const kind = NODE_KINDS.includes(n.kind as MapNodeKind) ? (n.kind as MapNodeKind) : 'module';
  return {
    id: str(n.id),
    kind,
    title: str(n.title),
    notes: optionalStr(n.notes),
    color: mapColorHex(n.color as MapColor) ? (n.color as MapColor) : undefined,
    x: num(n.x),
    y: num(n.y),
    width: n.width !== undefined ? num(n.width) : undefined,
    height: n.height !== undefined ? num(n.height) : undefined,
    isDoneManual: n.isDoneManual === true ? true : undefined,
    seedKey: optionalStr(n.seedKey),
  };
}

function normalizeLink(raw: unknown, nodeIds: Set<string>): MapLink | null {
  const l = asRecord(raw);
  if (!l) return null;
  const fromNodeId = str(l.fromNodeId);
  const toNodeId = str(l.toNodeId);
  if (!nodeIds.has(fromNodeId) || !nodeIds.has(toNodeId)) return null;
  return {
    id: str(l.id) || makeId('link'),
    fromNodeId,
    toNodeId,
    fromHandle: HANDLE_IDS.includes(str(l.fromHandle)) ? str(l.fromHandle) : undefined,
    toHandle: HANDLE_IDS.includes(str(l.toHandle)) ? str(l.toHandle) : undefined,
    label: optionalStr(l.label),
    style: LINK_STYLES.includes(l.style as MapLinkStyle) ? (l.style as MapLinkStyle) : 'plain',
  };
}

/**
 * Converts one pre-map project (modules with doneItems/missingItems) to the map shape.
 * Each module keeps its id as the node id, so existing board cards stay linked; every scope
 * item without a live card becomes a map-only card with a deterministic id, so running this
 * on two devices never produces duplicates.
 */
function migrateLegacyProject(p: RawRecord, projectId: string, tasks: Task[]): { nodes: MapNode[]; newTasks: Task[]; renamed: Map<string, string> } {
  const taskIds = new Set(tasks.map((t) => t.id));
  const nodes: MapNode[] = [];
  const newTasks: Task[] = [];
  const renamed = new Map<string, string>();

  asArray(p.modules).forEach((rawModule, index) => {
    const m = asRecord(rawModule);
    if (!m) return;
    const nodeId = str(m.id) || `mod-migrated-${projectId}-${index}`;
    const name = str(m.name, 'Untitled Module');
    const doneItems = asArray(m.doneItems);
    const missingItems = asArray(m.missingItems);

    nodes.push({
      id: nodeId,
      kind: 'module',
      title: name,
      notes: optionalStr([str(m.summary), str(m.notes)].filter((s) => s.trim()).join('\n\n')),
      x: (index % 4) * (MODULE_WIDTH + MAP_GRID * 3),
      y: Math.floor(index / 4) * MAP_GRID * 10,
      isDoneManual: m.status === 'shipped' && doneItems.length + missingItems.length === 0 ? true : undefined,
    });

    const addItem = (rawItem: unknown, done: boolean) => {
      const item = asRecord(rawItem);
      if (!item) return;
      const title = str(item.title).trim();
      const linkedTaskId = str(item.linkedTaskId);
      if (linkedTaskId && taskIds.has(linkedTaskId)) {
        // Card already on the board: drop the old "[Module] " title prefix
        const prefix = `[${name}] `;
        const existing = tasks.find((t) => t.id === linkedTaskId);
        if (existing && existing.title.startsWith(prefix)) {
          renamed.set(linkedTaskId, existing.title.slice(prefix.length));
        }
        return;
      }
      const id = `task-scope-${str(item.id) || `${nodeId}-${title}`}`;
      if (!title || taskIds.has(id)) return;
      const createdAt = num(item.createdAt, Date.now());
      newTasks.push({
        id,
        title,
        description: optionalStr(item.details),
        columnId: done ? 'done' : 'backlog',
        priority: 'medium',
        context: 'work',
        subtasks: [],
        tags: [],
        elapsedSeconds: 0,
        isRunning: false,
        createdAt,
        completedAt: done ? num(item.completedAt, createdAt) : undefined,
        linkedProjectId: projectId,
        linkedModuleId: nodeId,
        isOnBoard: false,
      });
      taskIds.add(id);
    };

    doneItems.forEach((item) => addItem(item, true));
    missingItems.forEach((item) => addItem(item, false));
  });

  return { nodes, newTasks, renamed };
}

/**
 * Defensively sanitize project data from localStorage or the sync API, migrating any
 * pre-map projects. Returns the tasks array unchanged (same reference) when nothing migrated.
 */
export function normalizeProjects(raw: unknown, tasks: Task[]): { projects: Project[]; tasks: Task[] } {
  let nextTasks = tasks;
  const projects: Project[] = [];

  asArray(raw).forEach((rawProject) => {
    const p = asRecord(rawProject);
    if (!p) return;
    const id = str(p.id) || makeId('proj');

    let nodes: MapNode[];
    if (!Array.isArray(p.nodes) && Array.isArray(p.modules)) {
      const migrated = migrateLegacyProject(p, id, nextTasks);
      nodes = migrated.nodes;
      if (migrated.newTasks.length > 0 || migrated.renamed.size > 0) {
        nextTasks = [
          ...nextTasks.map((t) => {
            const title = migrated.renamed.get(t.id);
            return title !== undefined ? { ...t, title } : t;
          }),
          ...migrated.newTasks,
        ];
      }
    } else {
      nodes = asArray(p.nodes).map(normalizeNode).filter((n): n is MapNode => n !== null);
    }

    const nodeIds = new Set(nodes.map((n) => n.id));
    projects.push({
      id,
      name: str(p.name, 'Untitled Project'),
      description: str(p.description),
      color: str(p.color, PROJECT_COLORS[0]),
      nodes,
      links: asArray(p.links).map((l) => normalizeLink(l, nodeIds)).filter((l): l is MapLink => l !== null),
      createdAt: num(p.createdAt, Date.now()),
      updatedAt: num(p.updatedAt, Date.now()),
    });
  });

  return { projects, tasks: nextTasks };
}

// ==================== MAP FILE IMPORT (e.g. chillios-seed.json) ====================
export interface MapImportResult {
  projects: Project[];
  tasks: Task[];
  projectId: string;
  summary: string;
}

/**
 * Imports a map file ({ project, frames, modules, notes, links }, positions in grid cells).
 * Safe to run twice: a project with the same name is reused, nodes are matched by seed key,
 * and tasks by title within their module.
 */
export function importMapFile(projects: Project[], tasks: Task[], rawFile: unknown): MapImportResult {
  const file = asRecord(rawFile);
  const projectMeta = asRecord(file?.project);
  const projectName = str(projectMeta?.name).trim();
  if (!file || !projectName) {
    throw new Error('Not a map file: expected a "project" with a "name".');
  }

  const now = Date.now();
  const existing = projects.find((p) => p.name.trim().toLowerCase() === projectName.toLowerCase());
  const project: Project = existing
    ? { ...existing, nodes: [...existing.nodes], links: [...existing.links], updatedAt: now }
    : {
        id: makeId('proj'),
        name: projectName,
        description: '',
        color: str(projectMeta?.colour ?? projectMeta?.color, PROJECT_COLORS[0]),
        nodes: [],
        links: [],
        createdAt: now,
        updatedAt: now,
      };

  const nodeBySeedKey = new Map(project.nodes.filter((n) => n.seedKey).map((n) => [n.seedKey as string, n]));
  const newTasks: Task[] = [];
  let addedNodes = 0;

  const ensureNode = (seedKey: string, build: () => Omit<MapNode, 'id' | 'seedKey'>): MapNode => {
    const found = nodeBySeedKey.get(seedKey);
    if (found) return found;
    const node: MapNode = { id: makeId('node'), seedKey, ...build() };
    project.nodes.push(node);
    nodeBySeedKey.set(seedKey, node);
    addedNodes++;
    return node;
  };

  asArray(file.frames).forEach((raw) => {
    const f = asRecord(raw);
    const key = str(f?.key);
    if (!f || !key) return;
    ensureNode(`frame:${key}`, () => ({
      kind: 'frame',
      title: str(f.title, key),
      x: num(f.x) * MAP_GRID,
      y: num(f.y) * MAP_GRID,
      width: Math.max(4, num(f.w, 12)) * MAP_GRID,
      height: Math.max(4, num(f.h, 10)) * MAP_GRID,
    }));
  });

  asArray(file.modules).forEach((raw) => {
    const m = asRecord(raw);
    const key = str(m?.key);
    if (!m || !key) return;
    const node = ensureNode(`module:${key}`, () => ({
      kind: 'module',
      title: str(m.title, key),
      notes: optionalStr([str(m.notes), m.inRepo === true ? 'Code already exists in the repo (a hint, not proof it is finished).' : ''].filter(Boolean).join('\n\n')),
      x: num(m.x) * MAP_GRID,
      y: num(m.y) * MAP_GRID,
    }));
    const existingTitles = new Set(
      [...tasks, ...newTasks]
        .filter((t) => t.linkedProjectId === project.id && t.linkedModuleId === node.id)
        .map((t) => t.title.trim().toLowerCase())
    );
    asArray(m.tasks).forEach((rawTitle, index) => {
      const title = str(rawTitle).trim();
      if (!title || existingTitles.has(title.toLowerCase())) return;
      existingTitles.add(title.toLowerCase());
      // Stagger createdAt so the checklist keeps the file's order
      newTasks.push({ ...createMapTask(project.id, node.id, title), createdAt: now + index });
    });
  });

  asArray(file.notes).forEach((raw, index) => {
    const n = asRecord(raw);
    const text = str(n?.text).trim();
    if (!n || !text) return;
    ensureNode(`note:${index}`, () => ({
      kind: 'note',
      title: text,
      x: num(n.x) * MAP_GRID,
      y: num(n.y) * MAP_GRID,
    }));
  });

  let addedLinks = 0;
  asArray(file.links).forEach((raw) => {
    const l = asRecord(raw);
    const from = nodeBySeedKey.get(`module:${str(l?.from)}`);
    const to = nodeBySeedKey.get(`module:${str(l?.to)}`);
    if (!l || !from || !to) return;
    if (project.links.some((x) => x.fromNodeId === from.id && x.toNodeId === to.id)) return;
    project.links.push({ id: makeId('link'), fromNodeId: from.id, toNodeId: to.id, label: optionalStr(l.label), style: 'plain' });
    addedLinks++;
  });

  const nextProjects = existing ? projects.map((p) => (p.id === project.id ? project : p)) : [project, ...projects];
  const parts = [`${addedNodes} boxes`, `${newTasks.length} tasks`, `${addedLinks} lines`];
  return {
    projects: nextProjects,
    tasks: newTasks.length > 0 ? [...tasks, ...newTasks] : tasks,
    projectId: project.id,
    summary: `${existing ? 'Updated' : 'Created'} "${project.name}": added ${parts.join(', ')}.`,
  };
}
