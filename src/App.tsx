import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Task, ColumnId, AppSettings, TaskContext, User } from './types';
import { 
  loadStoredTasks, 
  saveStoredTasks, 
  loadStoredSettings, 
  saveStoredSettings,
  loadStoredActiveTaskId,
  saveStoredActiveTaskId
} from './utils/storage';
import { soundManager } from './utils/audio';
import { getMeApi, logoutApi } from './utils/auth';
import { 
  SyncStatus, 
  getStoredBoardKey, 
  saveStoredBoardKey, 
  getStoredLastSynced, 
  pullBoardFromCloud, 
  pushBoardToCloud 
} from './utils/sync';
import { FocusHUD } from './components/FocusHUD';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskModal } from './components/TaskModal';
import { WipLimitModal } from './components/WipLimitModal';
import { BackupModal } from './components/BackupModal';
import { HelpShortcutsModal } from './components/HelpShortcutsModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { AuthModal } from './components/AuthModal';

export const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => loadStoredTasks());
  const [settings, setSettings] = useState<AppSettings>(() => loadStoredSettings());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => loadStoredActiveTaskId());

  // Segregation & User state
  const [activeContext, setActiveContext] = useState<TaskContext | 'all'>('work');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Cloud Sync state
  const [boardKey, setBoardKey] = useState<string>(() => getStoredBoardKey());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [lastSynced, setLastSynced] = useState<number | null>(() => getStoredLastSynced());
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultColumnForNew, setDefaultColumnForNew] = useState<ColumnId>('backlog');
  const [wipViolationTask, setWipViolationTask] = useState<Task | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Synchronization refs to prevent circular pushes
  const isSyncingFromRemoteRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocalEditTimeRef = useRef<number>(Date.now());

  // Check authenticated user on mount
  useEffect(() => {
    getMeApi().then((user) => {
      if (user) setCurrentUser(user);
    });
  }, []);

  // Sync tasks to LocalStorage
  useEffect(() => {
    saveStoredTasks(tasks);
  }, [tasks]);

  // Sync settings & sound manager
  useEffect(() => {
    saveStoredSettings(settings);
    soundManager.setEnabled(settings.soundEnabled);
  }, [settings]);

  // Theme Manager: Sync system / dark / light mode to document <html> element
  useEffect(() => {
    const applyTheme = () => {
      const theme = settings.theme || 'system';
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    };

    applyTheme();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [settings.theme]);

  // Check active user session on startup
  useEffect(() => {
    getMeApi().then((user) => {
      if (user) {
        setCurrentUser(user);
        const userBoardKey = `user_${user.id}_default`;
        const currentKey = getStoredBoardKey();
        if (!currentKey || currentKey === 'default') {
          setBoardKey(userBoardKey);
          saveStoredBoardKey(userBoardKey);
        }
      }
    });
  }, []);

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

  // ==================== CLOUD SYNC LOGIC ====================
  // Pull latest updates from cloud
  const syncPullFromCloud = useCallback(async (key: string, isManual = false) => {
    setSyncStatus('syncing');
    const result = await pullBoardFromCloud(key);

    if (result.success) {
      setSyncStatus('synced');
      setLastSynced(Date.now());

      if (result.data) {
        // If remote has data
        const remoteTime = result.data.updatedAt || 0;
        if (remoteTime > lastLocalEditTimeRef.current || isManual) {
          isSyncingFromRemoteRef.current = true;
          if (Array.isArray(result.data.tasks)) {
            setTasks(result.data.tasks);
          }
          if (result.data.settings) {
            setSettings(result.data.settings);
          }
          if (result.data.activeTaskId !== undefined) {
            setActiveTaskId(result.data.activeTaskId);
          }
          lastLocalEditTimeRef.current = remoteTime;
          setTimeout(() => {
            isSyncingFromRemoteRef.current = false;
          }, 300);
        }
      } else {
        // First time initializing this board on cloud: push current local state!
        pushBoardToCloud(key, {
          tasks,
          settings,
          activeTaskId,
          updatedAt: Date.now(),
        });
      }
    } else {
      setSyncStatus(result.status);
    }
  }, [tasks, settings, activeTaskId]);

  // Initial mount sync
  useEffect(() => {
    syncPullFromCloud(boardKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey]);

  // Pull on window focus / tab visibility change (sync when switching back from phone/laptop)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncPullFromCloud(boardKey);
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [boardKey, syncPullFromCloud]);

  // Push local changes to cloud (debounced)
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    if (isSyncingFromRemoteRef.current) {
      return;
    }

    lastLocalEditTimeRef.current = Date.now();
    setSyncStatus('syncing');

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      const res = await pushBoardToCloud(boardKey, {
        tasks,
        settings,
        activeTaskId,
        updatedAt: lastLocalEditTimeRef.current,
      });

      if (res.success) {
        setSyncStatus('synced');
        setLastSynced(Date.now());
      } else if (res.conflict && res.data) {
        // Server has newer updates
        isSyncingFromRemoteRef.current = true;
        setTasks(res.data.tasks || []);
        if (res.data.settings) setSettings(res.data.settings);
        if (res.data.activeTaskId !== undefined) setActiveTaskId(res.data.activeTaskId);
        setSyncStatus('synced');
        setTimeout(() => {
          isSyncingFromRemoteRef.current = false;
        }, 300);
      } else {
        setSyncStatus(res.status);
      }
    }, 600);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [tasks, settings, activeTaskId, boardKey]);

  // Manual Force Push
  const handleForcePush = async () => {
    setSyncStatus('syncing');
    const res = await pushBoardToCloud(boardKey, {
      tasks,
      settings,
      activeTaskId,
      updatedAt: Date.now(),
      force: true,
    });
    if (res.success) {
      setSyncStatus('synced');
      setLastSynced(Date.now());
    } else {
      setSyncStatus(res.status);
    }
  };

  // Switch Board Key
  const handleUpdateBoardKey = (newKey: string) => {
    const clean = newKey.trim() || 'default';
    setBoardKey(clean);
    saveStoredBoardKey(clean);
  };

  // Auth Handlers
  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    const userBoardKey = `user_${user.id}_default`;
    setBoardKey(userBoardKey);
    saveStoredBoardKey(userBoardKey);
    syncPullFromCloud(userBoardKey, true);
  };

  const handleLogout = async () => {
    await logoutApi();
    setCurrentUser(null);
    setBoardKey('default');
    saveStoredBoardKey('default');
    syncPullFromCloud('default', true);
  };

  // ==================== TASK & APP ACTIONS ====================
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
  const handleQuickAddTask = useCallback((columnId: ColumnId, title: string, context?: TaskContext) => {
    const defaultCtx = context || (activeContext === 'personal' ? 'personal' : 'work');
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title,
      columnId,
      priority: 'medium',
      context: defaultCtx,
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
  }, [settings.autoStartTimerOnDoing, activeContext]);

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
      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? { ...t, ...taskData } : t))
      );
    } else {
      const newTask: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: taskData.title || 'Untitled Task',
        description: taskData.description,
        columnId: taskData.columnId || 'backlog',
        priority: taskData.priority || 'medium',
        context: taskData.context || (activeContext === 'personal' ? 'personal' : 'work'),
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
  }, [editingTask, settings.autoStartTimerOnDoing, activeContext]);

  // WIP Violation Trigger
  const handleWipViolation = useCallback((task: Task) => {
    soundManager.playWipWarning();
    setWipViolationTask(task);
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        setIsCloudSyncModalOpen(false);
        setIsAuthModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-offwhite-bg dark:bg-[#090a0f] text-zinc-800 dark:text-zinc-100 flex flex-col selection:bg-brand-500/30 selection:text-brand-700 dark:selection:text-brand-200 transition-colors duration-200">
      {/* Persistent Focus HUD */}
      <FocusHUD
        activeTask={activeTask}
        doingTasks={doingTasks}
        syncStatus={syncStatus}
        onOpenSyncModal={() => setIsCloudSyncModalOpen(true)}
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
        activeContext={activeContext}
        onSelectContext={setActiveContext}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Kanban Board Area */}
      <main className="flex-1 flex flex-col">
        <KanbanBoard
          tasks={tasks}
          activeTaskId={activeTask?.id || null}
          settings={settings}
          activeContext={activeContext}
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
        defaultContext={activeContext === 'personal' ? 'personal' : 'work'}
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

      {/* Cloud Synchronization Modal */}
      <CloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
        syncStatus={syncStatus}
        currentBoardKey={boardKey}
        lastSyncedTimestamp={lastSynced}
        onUpdateBoardKey={handleUpdateBoardKey}
        onForcePull={() => syncPullFromCloud(boardKey, true)}
        onForcePush={handleForcePush}
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

      {/* User Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};
