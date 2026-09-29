import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Project, Task } from '../../types';

const MAX_HISTORY = 50;

/** The open project and the cards it touches, as they were before (or after) one action. */
interface MapSnapshot {
  projectId: string;
  project: Project;
  // Cards linked to the project, plus any the action unlinked, so both directions restore them
  tasks: Task[];
}

/**
 * Puts cards back as the snapshot has them. Only the fields the map edits are restored, so a
 * timer's elapsed time or a description edited elsewhere is never rolled back. Cards linked to
 * the project that the snapshot doesn't know about were created after it and are removed.
 */
function applyTaskSnapshot(current: Task[], snapshot: MapSnapshot): Task[] {
  const byId = new Map(snapshot.tasks.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const next: Task[] = [];
  current.forEach((task) => {
    const saved = byId.get(task.id);
    if (saved) {
      seen.add(task.id);
      next.push({
        ...task,
        title: saved.title,
        ...restoredColumn(task, saved),
        isOnBoard: saved.isOnBoard,
        linkedProjectId: saved.linkedProjectId,
        linkedModuleId: saved.linkedModuleId,
      });
    } else if (task.linkedProjectId !== snapshot.projectId) {
      next.push(task);
    }
  });
  snapshot.tasks.forEach((saved) => {
    if (!seen.has(saved.id)) next.push({ ...saved, ...restoredColumn(saved, saved), isRunning: false });
  });
  return next;
}

// Undo never moves a card into Doing, so it can't get around the WIP limit; it lands in Today
function restoredColumn(current: Task, saved: Task): Pick<Task, 'columnId' | 'completedAt' | 'columnBeforeDone'> {
  if (saved.columnId === 'doing' && current.columnId !== 'doing') return { columnId: 'today', completedAt: undefined, columnBeforeDone: undefined };
  return { columnId: saved.columnId, completedAt: saved.completedAt, columnBeforeDone: saved.columnBeforeDone };
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

/**
 * Undo/redo for the open project map. Call record() just before each change; changes made in
 * the same event (e.g. deleting a module and its cards) share one step. History is cleared
 * when the open project changes.
 */
export function useMapHistory(
  project: Project | null,
  tasks: Task[],
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>,
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
) {
  const undoStack = useRef<MapSnapshot[]>([]);
  const redoStack = useRef<MapSnapshot[]>([]);
  const [depth, setDepth] = useState({ undo: 0, redo: 0 });
  // Latest render's values, so the callbacks below stay stable
  const latest = useRef({ project, tasks });
  latest.current = { project, tasks };
  const batching = useRef(false);

  const sync = () => setDepth({ undo: undoStack.current.length, redo: redoStack.current.length });

  const projectId = project?.id;
  useEffect(() => {
    undoStack.current = [];
    redoStack.current = [];
    setDepth({ undo: 0, redo: 0 });
  }, [projectId]);

  const snapshot = (extraTaskIds: Set<string> = new Set()): MapSnapshot | null => {
    const { project: p, tasks: all } = latest.current;
    if (!p) return null;
    return { projectId: p.id, project: p, tasks: all.filter((t) => t.linkedProjectId === p.id || extraTaskIds.has(t.id)) };
  };

  const record = useCallback(() => {
    if (batching.current) return;
    const s = snapshot();
    if (!s) return;
    batching.current = true;
    setTimeout(() => {
      batching.current = false;
    }, 0);
    undoStack.current = [...undoStack.current, s].slice(-MAX_HISTORY);
    redoStack.current = [];
    sync();
  }, []);

  const step = useCallback(
    (from: React.MutableRefObject<MapSnapshot[]>, to: React.MutableRefObject<MapSnapshot[]>) => {
      const target = from.current[from.current.length - 1];
      const inverse = snapshot(new Set(target?.tasks.map((t) => t.id)));
      if (!target || !inverse || target.projectId !== inverse.projectId) return;
      from.current = from.current.slice(0, -1);
      to.current = [...to.current, inverse].slice(-MAX_HISTORY);
      setProjects((prev) => prev.map((p) => (p.id === target.projectId ? { ...target.project, updatedAt: Date.now() } : p)));
      setTasks((prev) => applyTaskSnapshot(prev, target));
      sync();
    },
    [setProjects, setTasks]
  );

  const undo = useCallback(() => step(undoStack, redoStack), [step]);
  const redo = useCallback(() => step(redoStack, undoStack), [step]);

  // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y; text fields keep their own undo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return { record, undo, redo, canUndo: depth.undo > 0, canRedo: depth.redo > 0 };
}
