import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FolderGit2, FolderPlus, Plus, Upload, Download, Trash2, ChevronDown, X } from 'lucide-react';
import { Project, Task } from '../../types';
import {
  PROJECT_COLORS,
  createMapTask,
  getProjectProgress,
  groupTasksByModule,
  importMapFile,
  isTaskDone,
  makeId,
  setTaskDone,
  setTaskOnBoard,
} from '../../utils/projectMap';
import { exportProjectToDrawio, importDrawioFile } from '../../utils/drawio';
import { downloadFile } from '../../utils/storage';
import { soundManager } from '../../utils/audio';
import { ProjectCanvas } from './ProjectCanvas';
import { ModulePanel } from './ModulePanel';

export interface MapFocus {
  projectId: string;
  nodeId: string;
}

interface ProjectMapDashboardProps {
  projects: Project[];
  tasks: Task[];
  onUpdateProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  onUpdateTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onEditTask: (task: Task) => void;
  focus: MapFocus | null;
  onFocusHandled: () => void;
}

const STORAGE_KEY_ACTIVE_PROJECT = 'headroom_active_project_v1';

function loadActiveProjectId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_PROJECT) || '';
  } catch {
    return '';
  }
}

export const ProjectMapDashboard: React.FC<ProjectMapDashboardProps> = ({
  projects,
  tasks,
  onUpdateProjects,
  onUpdateTasks,
  onEditTask,
  focus,
  onFocusHandled,
}) => {
  const [activeProjectId, setActiveProjectId] = useState<string>(loadActiveProjectId);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [importMessage, setImportMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  useEffect(() => {
    try {
      if (activeProject) localStorage.setItem(STORAGE_KEY_ACTIVE_PROJECT, activeProject.id);
    } catch {
      // Remembering the open project is a convenience only
    }
  }, [activeProject]);

  // Arriving from a board card: switch project, then let the canvas centre the module
  useEffect(() => {
    if (!focus) return;
    setActiveProjectId(focus.projectId);
    setFocusNodeId(focus.nodeId);
    onFocusHandled();
  }, [focus, onFocusHandled]);

  const progress = useMemo(() => (activeProject ? getProjectProgress(activeProject, tasks) : null), [activeProject, tasks]);

  const updateActiveProject = useCallback(
    (update: (p: Project) => Project) => {
      if (!activeProject) return;
      const id = activeProject.id;
      onUpdateProjects((prev) => prev.map((p) => (p.id === id ? { ...update(p), updatedAt: Date.now() } : p)));
    },
    [activeProject, onUpdateProjects]
  );

  const updateTask = useCallback(
    (taskId: string, update: (t: Task) => Task) => onUpdateTasks((prev) => prev.map((t) => (t.id === taskId ? update(t) : t))),
    [onUpdateTasks]
  );

  // Shared by the box on the canvas and the details panel
  const addModuleTasks = useCallback(
    (nodeId: string, titles: string[]) => {
      if (!activeProject) return;
      const projectId = activeProject.id;
      const now = Date.now();
      // Stagger createdAt so the checklist keeps the typed order
      const created = titles.map((title, i) => ({ ...createMapTask(projectId, nodeId, title), createdAt: now + i }));
      onUpdateTasks((prev) => [...prev, ...created]);
    },
    [activeProject, onUpdateTasks]
  );

  const toggleTaskDone = useCallback(
    (task: Task) => {
      const done = !isTaskDone(task);
      updateTask(task.id, (t) => setTaskDone(t, done));
      if (done) soundManager.playSubtaskCheck();
    },
    [updateTask]
  );

  const selectedNode = activeProject?.nodes.find((n) => n.id === selectedNodeId && n.kind === 'module') || null;
  const selectedTasks = useMemo(
    () => (activeProject && selectedNode ? groupTasksByModule(tasks, activeProject.id).get(selectedNode.id) || [] : []),
    [activeProject, selectedNode, tasks]
  );

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const now = Date.now();
    const project: Project = {
      id: makeId('proj'),
      name: newProjectName.trim(),
      description: '',
      color: newProjectColor,
      nodes: [],
      links: [],
      createdAt: now,
      updatedAt: now,
    };
    onUpdateProjects((prev) => [project, ...prev]);
    setActiveProjectId(project.id);
    setNewProjectName('');
    setIsNewProjectOpen(false);
  };

  const handleDeleteProject = () => {
    if (!activeProject) return;
    const id = activeProject.id;
    const onBoard = tasks.filter((t) => t.linkedProjectId === id && t.isOnBoard !== false).length;
    const message = `Delete project "${activeProject.name}"?\n\nIts map-only tasks are deleted.${
      onBoard > 0 ? ` The ${onBoard} card(s) on the board are kept as plain cards.` : ''
    }`;
    if (!window.confirm(message)) return;
    onUpdateTasks((prev) =>
      prev
        .filter((t) => t.linkedProjectId !== id || t.isOnBoard !== false)
        .map((t) => (t.linkedProjectId === id ? { ...t, linkedProjectId: undefined, linkedModuleId: undefined } : t))
    );
    onUpdateProjects((prev) => prev.filter((p) => p.id !== id));
    setSelectedNodeId(null);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = String(reader.result);
        // draw.io files are XML; map files are JSON
        const result = text.trimStart().startsWith('<')
          ? await importDrawioFile(projects, tasks, text, file.name)
          : importMapFile(projects, tasks, JSON.parse(text));
        onUpdateProjects(result.projects);
        onUpdateTasks(result.tasks);
        setActiveProjectId(result.projectId);
        setSelectedNodeId(null);
        setImportMessage({ ok: true, text: result.summary });
      } catch (err) {
        setImportMessage({ ok: false, text: err instanceof Error ? err.message : 'Could not read that file.' });
      }
    };
    reader.readAsText(file);
  };

  const handleExportDrawio = () => {
    if (!activeProject) return;
    const slug = activeProject.name.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
    downloadFile(`${slug}.drawio`, exportProjectToDrawio(activeProject, tasks), 'application/vnd.jgraph.mxfile');
  };

  const newProjectForm = isNewProjectOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={() => setIsNewProjectOpen(false)}>
      <form
        onSubmit={handleCreateProject}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-offwhite-surface dark:bg-[#12151f] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4"
      >
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">New project</h2>
        <input
          autoFocus
          required
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="e.g. ChilliOS"
          className="w-full text-xs px-3 py-2 rounded-xl bg-offwhite-input dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
        />
        <div className="flex flex-wrap gap-2">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setNewProjectColor(c)}
              className={`h-6 w-6 rounded-full transition ${newProjectColor === c ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-white dark:ring-offset-zinc-900' : ''}`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setIsNewProjectOpen(false)} className="px-3 py-1.5 rounded-xl text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white">
            Create
          </button>
        </div>
      </form>
    </div>
  );

  const fileInput = (
    <input ref={fileInputRef} type="file" accept=".json,.drawio,.xml,application/json" className="hidden" onChange={handleImportFile} />
  );

  const importBanner = importMessage && (
    <div
      className={`flex items-center justify-between gap-3 text-xs px-3 py-2 rounded-xl border ${
        importMessage.ok
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
          : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
      }`}
    >
      <span>{importMessage.text}</span>
      <button onClick={() => setImportMessage(null)}>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  if (!activeProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto px-4 py-20 text-center space-y-5">
        <div className="h-16 w-16 rounded-3xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
          <FolderPlus className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Project maps</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Lay out a project's modules on a whiteboard. Each module's tasks are real cards: tick them here or finish them on the board.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => setIsNewProjectOpen(true)} className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> New project
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import map or draw.io file
          </button>
        </div>
        {importBanner}
        {fileInput}
        {newProjectForm}
      </div>
    );
  }

  const projectId = activeProject.id;
  const selectedId = selectedNode?.id;

  return (
    <div className="flex-1 flex flex-col w-full px-3 sm:px-4 py-3 gap-3">
      <div className="flex flex-wrap items-center gap-3 bg-offwhite-surface dark:bg-[#12151f] px-3 py-2.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: activeProject.color }}>
          <FolderGit2 className="w-4 h-4" />
        </div>
        <div className="relative">
          <select
            value={activeProject.id}
            onChange={(e) => {
              setActiveProjectId(e.target.value);
              setSelectedNodeId(null);
            }}
            className="appearance-none text-base font-bold text-zinc-900 dark:text-white bg-transparent pr-6 focus:outline-none cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-white dark:bg-zinc-900 text-sm">
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-0 top-1.5 pointer-events-none" />
        </div>

        {progress && (
          <div className="flex items-center gap-2 min-w-[160px] flex-1 max-w-xs">
            <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress.percentage}%` }} />
            </div>
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
              {progress.doneModules}/{progress.totalModules} modules · {progress.doneTasks}/{progress.totalTasks} tasks
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          <button onClick={() => setIsNewProjectOpen(true)} className="p-2 rounded-lg text-zinc-500 hover:text-brand-600 hover:bg-brand-500/10 transition" title="New project">
            <FolderPlus className="w-4 h-4" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg text-zinc-500 hover:text-brand-600 hover:bg-brand-500/10 transition" title="Import a map or draw.io file (safe to re-import)">
            <Upload className="w-4 h-4" />
          </button>
          <button onClick={handleExportDrawio} className="p-2 rounded-lg text-zinc-500 hover:text-brand-600 hover:bg-brand-500/10 transition" title="Export to draw.io (open in draw.io to save as Visio)">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={handleDeleteProject} className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition" title="Delete project">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {importBanner}

      <div className="relative flex-1 min-h-[480px] h-[calc(100vh-190px)] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden bg-offwhite-bg dark:bg-[#0c0e14]">
        <ProjectCanvas
          key={projectId}
          project={activeProject}
          tasks={tasks}
          selectedNodeId={selectedId || null}
          focusNodeId={focusNodeId}
          onFocusHandled={() => setFocusNodeId(null)}
          onSelectModule={setSelectedNodeId}
          onUpdateProject={updateActiveProject}
          onAddModuleTasks={addModuleTasks}
          onToggleTaskDone={toggleTaskDone}
        />
      </div>

      {selectedNode && (
        <ModulePanel
          node={selectedNode}
          color={activeProject.color}
          tasks={selectedTasks}
          onClose={() => setSelectedNodeId(null)}
          onRename={(title) =>
            updateActiveProject((p) => ({ ...p, nodes: p.nodes.map((n) => (n.id === selectedNode.id ? { ...n, title } : n)) }))
          }
          onUpdateNotes={(notes) =>
            updateActiveProject((p) => ({
              ...p,
              nodes: p.nodes.map((n) => (n.id === selectedNode.id ? { ...n, notes: notes.trim() ? notes : undefined } : n)),
            }))
          }
          onToggleManualDone={() =>
            updateActiveProject((p) => ({
              ...p,
              nodes: p.nodes.map((n) => (n.id === selectedNode.id ? { ...n, isDoneManual: !n.isDoneManual || undefined } : n)),
            }))
          }
          onAddTasks={(titles) => addModuleTasks(selectedNode.id, titles)}
          onToggleTaskDone={toggleTaskDone}
          onRenameTask={(task, title) => updateTask(task.id, (t) => ({ ...t, title }))}
          onToggleTaskOnBoard={(task) => updateTask(task.id, (t) => setTaskOnBoard(t, t.isOnBoard === false))}
          onSendAllOpenToBoard={() =>
            onUpdateTasks((prev) =>
              prev.map((t) =>
                t.linkedProjectId === projectId && t.linkedModuleId === selectedNode.id && !isTaskDone(t) ? setTaskOnBoard(t, true) : t
              )
            )
          }
          onDeleteTask={(task) => onUpdateTasks((prev) => prev.filter((t) => t.id !== task.id))}
          onEditTask={onEditTask}
          onDeleteModule={(keepCards) => {
            const nodeId = selectedNode.id;
            const isModuleTask = (t: Task) => t.linkedProjectId === projectId && t.linkedModuleId === nodeId;
            onUpdateTasks((prev) =>
              keepCards
                ? prev.map((t) => (isModuleTask(t) ? { ...t, linkedProjectId: undefined, linkedModuleId: undefined, isOnBoard: true } : t))
                : prev.filter((t) => !isModuleTask(t))
            );
            updateActiveProject((p) => ({
              ...p,
              nodes: p.nodes.filter((n) => n.id !== nodeId),
              links: p.links.filter((l) => l.fromNodeId !== nodeId && l.toNodeId !== nodeId),
            }));
            setSelectedNodeId(null);
          }}
        />
      )}

      {fileInput}
      {newProjectForm}
    </div>
  );
};
