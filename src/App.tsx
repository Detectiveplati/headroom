import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Task, ColumnId, AppSettings } from './types';
import { 
  loadStoredTasks, 
  saveStoredTasks, 
  loadStoredSettings, 
  saveStoredSettings,
  loadStoredActiveTaskId,
  saveStoredActiveTaskId
} from './utils/storage';
import { soundManager } from './utils/audio';
import { FocusHUD } from './components/FocusHUD';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskModal } from './components/TaskModal';
import { WipLimitModal } from './components/WipLimitModal';
import { BackupModal } from './components/BackupModal';
import { HelpShortcutsModal } from './components/HelpShortcutsModal';

export const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => loadStoredTasks());
  const [settings, setSettings] = useState<AppSettings>(() => loadStoredSettings());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => loadStoredActiveTaskId());

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultColumnForNew, setDefaultColumnForNew] = useState<ColumnId>('backlog');
  const [wipViolationTask, setWipViolationTask] = useState<Task | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Sync tasks to LocalStorage
  useEffect(() => {
    saveStoredTasks(tasks);
  }, [tasks]);

  // Sync settings & sound manager
  useEffect(() => {
    saveStoredSettings(settings);
    soundManager.setEnabled(settings.soundEnabled);
  }, [settings]);

  // Sync active task ID
  useEffect(() => {
    saveStoredActiveTaskId(activeTaskId);
  }, [activeTaskId]);

  // Keep activeTaskId valid: if activeTask is no longer in 'doing', pick first doing task
  const doingTasks = tasks.filter((t) => t.columnId === 'doing');
  const activeTask = tasks.find((t) => t.id === activeTaskId && t.columnId === 'doing') 
    || doingTasks[0] 
    || null;

  useEffect(() => {
    if (activeTask && activeTask.id !== activeTaskId) {
      setActiveTaskId(activeTask.id);
    } else if (!activeTask && activeTaskId !== null && doingTasks.length === 0) {
      setActiveTaskId(null);
    }
  }, [activeTask, activeTaskId, doingTasks.length]);

  // Global active timer ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks((prev) => {
        let hasRunning = false;
        const next = prev.map((t) => {
          if (t.isRunning) {
            hasRunning = true;
            return { ...t, elapsedSeconds: t.elapsedSeconds + 1 };
          }
          return t;
        });
        return hasRunning ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Confetti helper
  const triggerConfetti = useCallback(() => {
    if (!settings.confettiEnabled) return;
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.2 },
      colors: ['#5e6ad2', '#10b981', '#f59e0b', '#38bdf8', '#ec4899'],
    });
  }, [settings.confettiEnabled]);

  // Task Completion
  const handleCompleteTask = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              columnId: 'done' as ColumnId,
              isRunning: false,
              completedAt: Date.now(),
              subtasks: t.subtasks.map((st) => ({ ...st, completed: true })),
            }
          : t
      )
    );

    soundManager.playCompleteChime();
    triggerConfetti();
  }, [triggerConfetti]);

  // Task Move
  const handleMoveTask = useCallback((taskId: string, targetCol: ColumnId) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;

        const isMovingToDone = targetCol === 'done';
        const isMovingToDoing = targetCol === 'doing';

        if (isMovingToDone) {
          soundManager.playCompleteChime();
          triggerConfetti();
        }

        return {
          ...t,
          columnId: targetCol,
          isRunning: isMovingToDoing ? (settings.autoStartTimerOnDoing ? true : t.isRunning) : false,
          completedAt: isMovingToDone ? Date.now() : undefined,
        };
      })
    );

    if (targetCol === 'doing') {
      setActiveTaskId(taskId);
    }
  }, [settings.autoStartTimerOnDoing, triggerConfetti]);

  // Timer Toggle
  const handleToggleTimer = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, isRunning: !t.isRunning } : t
      )
    );
    setActiveTaskId(taskId);
  }, []);

  // Timer Reset
  const handleResetTimer = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, elapsedSeconds: 0, isRunning: false } : t
      )
    );
  }, []);

  // Subtask Toggle
  const handleToggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const nextSubtasks = t.subtasks.map((st) =>
          st.id === subtaskId ? { ...st, completed: !st.completed } : st
        );
        return { ...t, subtasks: nextSubtasks };
      })
    );
    soundManager.playSubtaskCheck();
  }, []);

  // Quick Add Task in Column
  const handleQuickAddTask = useCallback((columnId: ColumnId, title: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title,
      columnId,
      priority: 'medium',
      subtasks: [],
      tags: [],
      elapsedSeconds: 0,
      isRunning: columnId === 'doing' && settings.autoStartTimerOnDoing,
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTask, ...prev]);

    if (columnId === 'doing') {
      setActiveTaskId(newTask.id);
    }
  }, [settings.autoStartTimerOnDoing]);

  // Delete Task
  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (activeTaskId === taskId) {
      setActiveTaskId(null);
    }
  }, [activeTaskId]);

  // Save / Edit Task from Modal
  const handleSaveTaskModal = useCallback((taskData: Partial<Task>) => {
    if (editingTask) {
      // Edit existing
      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? { ...t, ...taskData } : t))
      );
    } else {
      // Create new
      const newTask: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: taskData.title || 'Untitled Task',
        description: taskData.description,
        columnId: taskData.columnId || 'backlog',
        priority: taskData.priority || 'medium',
        subtasks: taskData.subtasks || [],
        tags: taskData.tags || [],
        elapsedSeconds: 0,
        isRunning: taskData.columnId === 'doing' && settings.autoStartTimerOnDoing,
        createdAt: Date.now(),
        dueDate: taskData.dueDate,
      };
      setTasks((prev) => [newTask, ...prev]);

      if (newTask.columnId === 'doing') {
        setActiveTaskId(newTask.id);
      }
    }
  }, [editingTask, settings.autoStartTimerOnDoing]);

  // WIP Violation Trigger
  const handleWipViolation = useCallback((task: Task) => {
    soundManager.playWipWarning();
    setWipViolationTask(task);
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in input or textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setEditingTask(null);
        setDefaultColumnForNew('backlog');
        setIsTaskModalOpen(true);
      } else if (!isInput && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setEditingTask(null);
        setDefaultColumnForNew('backlog');
        setIsTaskModalOpen(true);
      } else if (!isInput && e.key === '?') {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
      } else if (e.key === 'Escape') {
        setIsTaskModalOpen(false);
        setWipViolationTask(null);
        setIsBackupModalOpen(false);
        setIsShortcutsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col selection:bg-brand-500/30 selection:text-brand-200">
      {/* Persistent Focus HUD */}
      <FocusHUD
        activeTask={activeTask}
        doingTasks={doingTasks}
        onSelectActiveTask={(taskId) => setActiveTaskId(taskId)}
        onToggleTimer={handleToggleTimer}
        onResetTimer={handleResetTimer}
        onCompleteTask={handleCompleteTask}
        onOpenNewTaskModal={() => {
          setEditingTask(null);
          setDefaultColumnForNew('backlog');
          setIsTaskModalOpen(true);
        }}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        onOpenTaskModal={(task) => {
          setEditingTask(task);
          setIsTaskModalOpen(true);
        }}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings((s) => ({ ...s, ...newSettings }))}
      />

      {/* Main Kanban Board Area */}
      <main className="flex-1 flex flex-col">
        <KanbanBoard
          tasks={tasks}
          activeTaskId={activeTask?.id || null}
          settings={settings}
          onEditTask={(task) => {
            setEditingTask(task);
            setIsTaskModalOpen(true);
          }}
          onDeleteTask={handleDeleteTask}
          onMoveTask={handleMoveTask}
          onToggleSubtask={handleToggleSubtask}
          onQuickAddTask={handleQuickAddTask}
          onToggleTimer={handleToggleTimer}
          onFocusTask={(taskId) => setActiveTaskId(taskId)}
          onWipViolation={handleWipViolation}
        />
      </main>

      {/* Task Create / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTaskModal}
        initialTask={editingTask}
        defaultColumnId={defaultColumnForNew}
      />

      {/* WIP Guardrail Modal */}
      <WipLimitModal
        isOpen={!!wipViolationTask}
        onClose={() => setWipViolationTask(null)}
        pendingTask={wipViolationTask}
        doingTasks={doingTasks}
        wipLimit={settings.wipLimit}
        onCompleteDoingTask={handleCompleteTask}
        onMoveBackToToday={(taskId) => handleMoveTask(taskId, 'today')}
        onForceProceed={(task) => {
          handleMoveTask(task.id, 'doing');
          setWipViolationTask(null);
        }}
      />

      {/* Backup & Sync Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        tasks={tasks}
        settings={settings}
        onRestoreData={(newTasks, newSettings) => {
          setTasks(newTasks);
          if (newSettings) setSettings(newSettings);
        }}
      />

      {/* Help & Shortcuts Modal */}
      <HelpShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
};
