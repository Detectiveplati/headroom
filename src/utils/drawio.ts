import { Project, Task, MapNode, MapLink, MapNodeKind, MapLinkStyle, MapColor } from '../types';
import {
  MAP_GRID,
  MODULE_WIDTH,
  MAP_COLORS,
  PROJECT_COLORS,
  MapImportResult,
  createMapTask,
  groupTasksByModule,
  isInsideFrame,
  isTaskDone,
  makeId,
  mapColorHex,
  setTaskDone,
} from './projectMap';

/*
 * draw.io (diagrams.net) files: an <mxfile> holding one <diagram> per page, each an mxGraph
 * model of cells. Boxes are exported as UserObjects carrying headroom* attributes so a round
 * trip matches them back up; a module's tasks are "☐ task" / "☑ task" lines in its label,
 * so ticking or adding lines in draw.io comes back on import. draw.io itself converts these
 * files to and from Visio (.vsdx).
 */

const OPEN_MARK = '☐';
const DONE_MARK = '☑';
// Task lines typed in draw.io: ☐ / ☑ marks, [ ] / [x], or plain bullets (open)
const TASK_LINE = /^(☐|☑|✓|✔|☒|\[ ?\]|\[x\]|-|\*|•)\s*(.+)$/i;
const DONE_TASK_MARK = /^(☑|✓|✔|☒|\[x\])$/i;
const BLOCKS_STROKE = '#ef4444';
const PLAIN_STROKE = '#94a3b8';
const NOTE_FILL = '#fff2cc';
const NOTE_STROKE = '#d6b656';
// Rough fit for 11px text in a module-wide box, used to size exported boxes
const CHARS_PER_LINE = 24;
const LINE_HEIGHT = 17;

const NODE_KINDS: MapNodeKind[] = ['module', 'note', 'frame'];

// ==================== EXPORT ====================
function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&#10;');
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Mixes a #rrggbb colour with white; draw.io styles take plain hex. */
function tint(hex: string, amount: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  return (
    '#' +
    [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map((c) => Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0'))
      .join('')
  );
}

function wrappedLines(text: string): number {
  return Math.max(1, Math.ceil(text.length / CHARS_PER_LINE));
}

function snapUp(v: number): number {
  return Math.ceil(v / MAP_GRID) * MAP_GRID;
}

interface ExportCell {
  node: MapNode;
  label: string;
  style: string;
  width: number;
  height: number;
}

function moduleCell(node: MapNode, project: Project, moduleTasks: Task[]): ExportCell {
  const category = mapColorHex(node.color);
  const stroke = category ?? project.color;
  const taskLines = moduleTasks.map((t) => `${isTaskDone(t) ? DONE_MARK : OPEN_MARK} ${t.title}`);
  const label =
    `<b>${escHtml(node.title || 'Untitled module')}</b>` +
    (taskLines.length > 0 ? `<br><span style="font-size:11px">${taskLines.map(escHtml).join('<br>')}</span>` : '');
  const lines = wrappedLines(node.title) + taskLines.reduce((sum, l) => sum + wrappedLines(l), 0);
  return {
    node,
    label,
    width: MODULE_WIDTH,
    height: Math.max(MAP_GRID * 3, snapUp(16 + lines * LINE_HEIGHT)),
    style:
      'rounded=1;arcSize=6;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacingLeft=8;spacingRight=8;spacingTop=2;' +
      `fontSize=12;strokeWidth=2;strokeColor=${stroke};fillColor=${category ? tint(category, 0.88) : '#ffffff'};`,
  };
}

function noteCell(node: MapNode): ExportCell {
  const category = mapColorHex(node.color);
  const lines = node.title.split('\n');
  return {
    node,
    label: lines.map(escHtml).join('<br>'),
    width: MAP_GRID * 8,
    height: Math.max(MAP_GRID * 2, snapUp(16 + lines.reduce((sum, l) => sum + wrappedLines(l), 0) * LINE_HEIGHT)),
    style:
      'shape=note;size=14;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacing=8;fontSize=11;' +
      `fillColor=${category ? tint(category, 0.8) : NOTE_FILL};strokeColor=${category ?? NOTE_STROKE};`,
  };
}

function frameCell(node: MapNode): ExportCell {
  const category = mapColorHex(node.color);
  const stroke = category ?? '#a1a1aa';
  return {
    node,
    label: escHtml(node.title || 'Frame'),
    width: node.width ?? MAP_GRID * 12,
    height: node.height ?? MAP_GRID * 10,
    // A container, so moving the frame in draw.io carries its boxes as it does here
    style:
      'rounded=1;arcSize=3;whiteSpace=wrap;html=1;dashed=1;container=1;collapsible=0;align=left;verticalAlign=top;' +
      `spacingLeft=12;spacingTop=2;fontStyle=1;fontSize=12;strokeColor=${stroke};fontColor=${stroke};` +
      `fillColor=${category ? tint(category, 0.94) : 'none'};`,
  };
}

function vertexXml(cell: ExportCell, parent: MapNode | undefined): string {
  const { node } = cell;
  const attrs = [
    `label="${escXml(cell.label)}"`,
    node.notes ? `tooltip="${escXml(node.notes)}"` : '',
    `headroomKind="${node.kind}"`,
    node.color ? `headroomColor="${node.color}"` : '',
    node.isDoneManual ? 'headroomDone="1"' : '',
    `id="${escXml(node.id)}"`,
  ].filter(Boolean);
  // draw.io's own lock, so the shape is pinned there too
  const style = node.isLocked ? `${cell.style}locked=1;` : cell.style;
  // Children of a frame are positioned relative to it
  const x = parent ? node.x - parent.x : node.x;
  const y = parent ? node.y - parent.y : node.y;
  return (
    `        <UserObject ${attrs.join(' ')}>\n` +
    `          <mxCell style="${escXml(style)}" vertex="1" parent="${parent ? escXml(parent.id) : '1'}">\n` +
    `            <mxGeometry x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(cell.width)}" height="${Math.round(cell.height)}" as="geometry" />\n` +
    '          </mxCell>\n' +
    '        </UserObject>\n'
  );
}

function edgeXml(link: MapLink): string {
  const stroke = link.style === 'blocks' ? BLOCKS_STROKE : PLAIN_STROKE;
  const style =
    'edgeStyle=orthogonalEdgeStyle;curved=1;html=1;endArrow=block;endFill=1;fontSize=10;' +
    `strokeColor=${stroke};strokeWidth=${link.style === 'blocks' ? 2 : 1.5};${link.style === 'dashed' ? 'dashed=1;' : ''}`;
  return (
    `        <mxCell id="${escXml(link.id)}" value="${escXml(escHtml(link.label || ''))}" style="${escXml(style)}" edge="1" parent="1" source="${escXml(link.fromNodeId)}" target="${escXml(link.toNodeId)}">\n` +
    '          <mxGeometry relative="1" as="geometry" />\n' +
    '        </mxCell>\n'
  );
}

/** The project as a .drawio file (uncompressed XML). */
export function exportProjectToDrawio(project: Project, tasks: Task[]): string {
  const byModule = groupTasksByModule(tasks, project.id);
  const frames = project.nodes.filter((n) => n.kind === 'frame');
  const cells: string[] = [];

  // Frames first so they sit behind everything
  frames.forEach((f) => cells.push(vertexXml(frameCell(f), undefined)));
  project.nodes.forEach((n) => {
    if (n.kind === 'frame') return;
    const parent = frames.find((f) => isInsideFrame(n, f));
    const cell = n.kind === 'note' ? noteCell(n) : moduleCell(n, project, byModule.get(n.id) || []);
    cells.push(vertexXml(cell, parent));
  });
  project.links.forEach((l) => cells.push(edgeXml(l)));

  return (
    '<mxfile host="Headroom" agent="Headroom">\n' +
    `  <diagram id="${escXml(project.id)}" name="${escXml(project.name)}">\n` +
    `    <mxGraphModel grid="1" gridSize="${MAP_GRID}" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" shadow="0">\n` +
    '      <root>\n' +
    '        <mxCell id="0" />\n' +
    '        <mxCell id="1" parent="0" />\n' +
    cells.join('') +
    '      </root>\n' +
    '    </mxGraphModel>\n' +
    '  </diagram>\n' +
    '</mxfile>\n'
  );
}

// ==================== IMPORT ====================
interface RawCell {
  id: string;
  parent: string;
  value: string;
  style: Map<string, string>;
  shapes: Set<string>;
  isVertex: boolean;
  isEdge: boolean;
  source: string;
  target: string;
  attrs: Element | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

function parseStyle(style: string): { values: Map<string, string>; shapes: Set<string> } {
  const values = new Map<string, string>();
  const shapes = new Set<string>();
  style.split(';').forEach((part) => {
    const [key, ...rest] = part.split('=');
    if (!key) return;
    if (rest.length > 0) values.set(key.trim(), rest.join('=').trim());
    else shapes.add(key.trim());
  });
  return { values, shapes };
}

function numAttr(el: Element | null, name: string): number {
  const n = Number(el?.getAttribute(name));
  return Number.isFinite(n) ? n : 0;
}

/** draw.io's compressed pages: base64 of raw-deflated, URI-encoded XML. */
async function inflateDiagram(data: string): Promise<string> {
  const bytes = Uint8Array.from(atob(data.trim()), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return decodeURIComponent(await new Response(stream).text());
}

async function readModel(xmlText: string): Promise<{ model: Element; pageName: string; pageId: string; pageCount: number }> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) throw new Error('Not a readable draw.io file.');
  const root = doc.documentElement;
  if (root.tagName === 'mxGraphModel') return { model: root, pageName: '', pageId: '', pageCount: 1 };

  const diagrams = Array.from(root.getElementsByTagName('diagram'));
  const diagram = diagrams[0];
  if (!diagram) throw new Error('No diagram found in this draw.io file.');
  const pageName = diagram.getAttribute('name') || '';
  const pageId = diagram.getAttribute('id') || '';
  const inline = diagram.getElementsByTagName('mxGraphModel')[0];
  if (inline) return { model: inline, pageName, pageId, pageCount: diagrams.length };

  let inflated: string;
  try {
    inflated = await inflateDiagram(diagram.textContent || '');
  } catch {
    throw new Error('Could not unpack this draw.io file. In draw.io, untick File > Properties > Compressed and save again.');
  }
  const model = parser.parseFromString(inflated, 'text/xml').documentElement;
  if (model.tagName !== 'mxGraphModel') throw new Error('No diagram found in this draw.io file.');
  return { model, pageName, pageId, pageCount: diagrams.length };
}

function readCells(model: Element): RawCell[] {
  const root = model.getElementsByTagName('root')[0];
  if (!root) return [];
  return Array.from(root.children).map((el): RawCell => {
    // Cells with custom data are wrapped: <UserObject label=... id=...><mxCell .../></UserObject>
    const wrapped = el.tagName !== 'mxCell';
    const cell = wrapped ? el.getElementsByTagName('mxCell')[0] ?? null : el;
    const geometry = cell?.getElementsByTagName('mxGeometry')[0] ?? null;
    const { values, shapes } = parseStyle(cell?.getAttribute('style') || '');
    return {
      id: el.getAttribute('id') || '',
      parent: cell?.getAttribute('parent') || '',
      value: (wrapped ? el.getAttribute('label') : cell?.getAttribute('value')) || '',
      style: values,
      shapes,
      isVertex: cell?.getAttribute('vertex') === '1',
      isEdge: cell?.getAttribute('edge') === '1',
      source: cell?.getAttribute('source') || '',
      target: cell?.getAttribute('target') || '',
      attrs: wrapped ? el : null,
      x: numAttr(geometry, 'x'),
      y: numAttr(geometry, 'y'),
      width: numAttr(geometry, 'width'),
      height: numAttr(geometry, 'height'),
    };
  });
}

/** A cell's label as plain text lines. HTML labels are parsed inertly, never rendered. */
function labelLines(cell: RawCell): string[] {
  let text = cell.value;
  if (cell.style.get('html') === '1') {
    const withBreaks = text.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(div|p|li)>/gi, '\n').replace(/<hr[^>]*>/gi, '\n');
    text = new DOMParser().parseFromString(withBreaks, 'text/html').body.textContent || '';
  }
  return text
    .replace(/ /g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function kindOf(cell: RawCell): MapNodeKind {
  const declared = cell.attrs?.getAttribute('headroomKind') as MapNodeKind | null;
  if (declared && NODE_KINDS.includes(declared)) return declared;
  if (cell.shapes.has('swimlane') || cell.style.get('container') === '1') return 'frame';
  const fill = (cell.style.get('fillColor') || '').toLowerCase();
  if (cell.style.get('shape') === 'note' || cell.shapes.has('text') || fill === NOTE_FILL || fill === '#ffff88') return 'note';
  return 'module';
}

function colorOf(cell: RawCell): MapColor | undefined {
  const declared = cell.attrs?.getAttribute('headroomColor') as MapColor | null;
  if (declared && mapColorHex(declared)) return declared;
  const stroke = (cell.style.get('strokeColor') || '').toLowerCase();
  return MAP_COLORS.find((c) => c.hex === stroke)?.key;
}

interface ParsedBox {
  cell: RawCell;
  kind: MapNodeKind;
  title: string;
  notes?: string;
  color?: MapColor;
  isDoneManual?: boolean;
  isLocked?: boolean;
  tasks: { title: string; done: boolean }[];
  x: number;
  y: number;
}

function parseBox(cell: RawCell, x: number, y: number): ParsedBox | null {
  const kind = kindOf(cell);
  const lines = labelLines(cell);
  const fromHeadroom = !!cell.attrs?.getAttribute('headroomKind');
  if (lines.length === 0 && kind !== 'frame' && !fromHeadroom) return null;

  const box: ParsedBox = {
    cell,
    kind,
    title: '',
    color: colorOf(cell),
    notes: cell.attrs?.getAttribute('tooltip')?.trim() || undefined,
    isDoneManual: cell.attrs?.getAttribute('headroomDone') === '1' || undefined,
    isLocked: cell.style.get('locked') === '1' || undefined,
    tasks: [],
    x: Math.round(x),
    y: Math.round(y),
  };
  if (kind === 'note') {
    box.title = lines.join('\n');
  } else if (kind === 'frame') {
    box.title = lines.join(' ');
  } else {
    const [title = '', ...rest] = lines;
    box.title = title;
    const extra: string[] = [];
    rest.forEach((line) => {
      const m = line.match(TASK_LINE);
      if (m) box.tasks.push({ title: m[2].trim(), done: DONE_TASK_MARK.test(m[1]) });
      else extra.push(line);
    });
    // Other text in a foreign shape's label becomes its notes
    if (!box.notes && extra.length > 0) box.notes = extra.join('\n');
  }
  return box;
}

function linkStyleOf(cell: RawCell): MapLinkStyle {
  if ((cell.style.get('strokeColor') || '').toLowerCase() === BLOCKS_STROKE) return 'blocks';
  return cell.style.get('dashed') === '1' ? 'dashed' : 'plain';
}

/**
 * Imports the first page of a .drawio file. The project is matched by id (files exported from
 * here) or name; boxes by their exported id or, for shapes drawn in draw.io, by cell id (seed
 * key), so re-importing the same file updates rather than duplicates. Tasks match by title in
 * their module. Nothing missing from the file is deleted.
 */
export async function importDrawioFile(
  projects: Project[],
  tasks: Task[],
  xmlText: string,
  fileName: string
): Promise<MapImportResult> {
  const { model, pageName, pageId, pageCount } = await readModel(xmlText);
  const cells = readCells(model);
  const byId = new Map(cells.map((c) => [c.id, c]));

  // Absolute position: children of shapes (containers, groups) are relative to their parent
  const absCache = new Map<string, { x: number; y: number }>();
  const absOf = (cell: RawCell, depth = 0): { x: number; y: number } => {
    const cached = absCache.get(cell.id);
    if (cached) return cached;
    const parent = byId.get(cell.parent);
    const base = parent && parent.isVertex && depth < 50 ? absOf(parent, depth + 1) : { x: 0, y: 0 };
    const pos = { x: base.x + cell.x, y: base.y + cell.y };
    absCache.set(cell.id, pos);
    return pos;
  };

  const boxes: ParsedBox[] = [];
  const edgeLabels = new Map<string, string>();
  cells.forEach((cell) => {
    if (!cell.isVertex) return;
    const parent = byId.get(cell.parent);
    // A label dragged along a line is a child cell of that line
    if (parent?.isEdge) {
      edgeLabels.set(parent.id, labelLines(cell).join(' '));
      return;
    }
    // Invisible draw.io groups only offset their children
    if (cell.shapes.has('group')) return;
    const { x, y } = absOf(cell);
    const box = parseBox(cell, x, y);
    if (box) boxes.push(box);
  });
  if (boxes.length === 0) throw new Error('No shapes with text found on the first page of this diagram.');

  const baseName = fileName.replace(/\.(drawio|xml)$/i, '').trim();
  const projectName = (pageName && !/^Page-\d+$/.test(pageName) ? pageName : baseName) || 'Imported diagram';
  const now = Date.now();
  const existing =
    projects.find((p) => pageId && p.id === pageId) ||
    projects.find((p) => p.name.trim().toLowerCase() === projectName.toLowerCase());
  const project: Project = existing
    ? { ...existing, nodes: [...existing.nodes], links: [...existing.links], updatedAt: now }
    : {
        id: makeId('proj'),
        name: projectName,
        description: '',
        color: PROJECT_COLORS[0],
        nodes: [],
        links: [],
        createdAt: now,
        updatedAt: now,
      };

  const cellToNode = new Map<string, string>();
  let addedNodes = 0;
  let updatedNodes = 0;
  boxes.forEach((box) => {
    const seedKey = `drawio:${box.cell.id}`;
    const index = project.nodes.findIndex((n) => n.id === box.cell.id || n.seedKey === seedKey);
    const size = box.kind === 'frame' ? { width: Math.round(box.cell.width), height: Math.round(box.cell.height) } : {};
    if (index >= 0) {
      const node = project.nodes[index];
      project.nodes[index] = {
        ...node,
        ...size,
        title: box.title,
        x: box.x,
        y: box.y,
        color: box.color,
        notes: box.notes ?? node.notes,
        isDoneManual: box.isDoneManual,
        isLocked: box.isLocked,
      };
      cellToNode.set(box.cell.id, node.id);
      updatedNodes++;
    } else {
      const node: MapNode = {
        id: makeId('node'),
        seedKey,
        kind: box.kind,
        title: box.title,
        notes: box.notes,
        color: box.color,
        x: box.x,
        y: box.y,
        isDoneManual: box.isDoneManual,
        isLocked: box.isLocked,
        ...size,
      };
      project.nodes.push(node);
      cellToNode.set(box.cell.id, node.id);
      addedNodes++;
    }
  });

  // Tasks: new lines become map-only cards; a changed tick updates the card
  const byModule = groupTasksByModule(tasks, project.id);
  const changedTasks = new Map<string, Task>();
  const newTasks: Task[] = [];
  boxes.forEach((box) => {
    if (box.kind !== 'module') return;
    const nodeId = cellToNode.get(box.cell.id);
    if (!nodeId) return;
    const existingByTitle = new Map((byModule.get(nodeId) || []).map((t) => [t.title.trim().toLowerCase(), t]));
    box.tasks.forEach((item, i) => {
      const key = item.title.toLowerCase();
      const task = existingByTitle.get(key);
      if (task) {
        if (isTaskDone(task) !== item.done) changedTasks.set(task.id, setTaskDone(task, item.done));
      } else {
        const created = { ...createMapTask(project.id, nodeId, item.title, item.done), createdAt: now + i };
        newTasks.push(created);
        existingByTitle.set(key, created);
      }
    });
  });

  let addedLinks = 0;
  cells.forEach((cell) => {
    if (!cell.isEdge) return;
    const fromNodeId = cellToNode.get(cell.source);
    const toNodeId = cellToNode.get(cell.target);
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) return;
    const label = (labelLines(cell).join(' ') || edgeLabels.get(cell.id) || '').trim() || undefined;
    const style = linkStyleOf(cell);
    const index = project.links.findIndex((l) => l.fromNodeId === fromNodeId && l.toNodeId === toNodeId);
    if (index >= 0) {
      project.links[index] = { ...project.links[index], label, style };
    } else {
      project.links.push({ id: makeId('link'), fromNodeId, toNodeId, label, style });
      addedLinks++;
    }
  });

  const nextTasks =
    changedTasks.size > 0 || newTasks.length > 0 ? [...tasks.map((t) => changedTasks.get(t.id) ?? t), ...newTasks] : tasks;
  const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const parts = [
    count(addedNodes, 'new box', 'new boxes'),
    ...(updatedNodes > 0 ? [`${updatedNodes} updated`] : []),
    count(newTasks.length, 'new task'),
    ...(changedTasks.size > 0 ? [`${count(changedTasks.size, 'tick')} changed`] : []),
    count(addedLinks, 'new line'),
  ];
  return {
    projects: existing ? projects.map((p) => (p.id === project.id ? project : p)) : [project, ...projects],
    tasks: nextTasks,
    projectId: project.id,
    summary:
      `${existing ? 'Updated' : 'Created'} "${project.name}" from draw.io: ${parts.join(', ')}.` +
      (pageCount > 1 ? ` Only the first of ${pageCount} pages was imported.` : ''),
  };
}
