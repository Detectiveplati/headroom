import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Task, 
  ColumnId, 
  AppSettings, 
  TaskContext, 
  User, 
  ActiveTab, 
  Transaction, 
  CategoryBudget, 
  ExpenseCategory, 
  CardMetaInfo,
  TrackedAccount,
  MonthlyAccountUpload,
  TaskColor,
  Project,
  ProjectModule,
  ModuleScopeItem
} from './types';
import { 
  loadStoredTasks, 
  saveStoredTasks, 
  loadStoredSettings, 
  saveStoredSettings,
  loadStoredActiveTaskId,
  saveStoredActiveTaskId,
  loadStoredTransactions,
  saveStoredTransactions,
  loadStoredBudgets,
  saveStoredBudgets,
  loadStoredCategoryRules,
  saveStoredCategoryRules,
  loadStoredCardMeta,
  saveStoredCardMeta,
  DEFAULT_BUDGETS,
  loadStoredAccounts,
  saveStoredAccounts,
  loadStoredUploadLogs,
  saveStoredUploadLogs,
  loadStoredProjects,
  saveStoredProjects
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
import { Sparkles } from 'lucide-react';
import { FocusHUD } from './components/FocusHUD';
import { KanbanBoard } from './components/KanbanBoard';
import { ExpenseDashboard } from './components/expenses/ExpenseDashboard';
import { ProjectManagementDashboard } from './components/projects/ProjectManagementDashboard';
import { LoginPage } from './components/LoginPage';
import { TaskModal } from './components/TaskModal';
import { WipLimitModal } from './components/WipLimitModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { parseNaturalLanguageDate } from './utils/dateParser';

export const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => loadStoredTasks());
  const [settings, setSettings] = useState<AppSettings>(() => loadStoredSettings());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => loadStoredActiveTaskId());

  // Active App Mode (Tasks / Kanban vs Financial Headroom vs Projects)
  const [activeTab, setActiveTab] = useState<ActiveTab>('tasks');

  // Projects & Modules state
  const [projects, setProjects] = useState<Project[]>(() => loadStoredProjects());

  // Financial & Expense state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>(DEFAULT_BUDGETS);
  const [categoryRules, setCategoryRules] = useState<Record<string, ExpenseCategory>>({});
  const [cardMeta, setCardMeta] = useState<CardMetaInfo>({});
  const [accounts, setAccounts] = useState<TrackedAccount[]>([]);
  const [uploadLogs, setUploadLogs] = useState<MonthlyAccountUpload[]>([]);

  // Segregation & User state
  const [activeContext, setActiveContext] = useState<TaskContext | 'all'>('work');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [financeOwnerId, setFinanceOwnerId] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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

  // Synchronization refs to prevent circular pushes
  const isSyncingFromRemoteRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocalEditTimeRef = useRef<number>(Date.now());

  // Check authenticated user on mount with loading gate
  useEffect(() => {
    getMeApi()
      .then((user) => {
        if (user) {
          setCurrentUser(user);
          const userBoardKey = `user_${user.id}_default`;
          setBoardKey(userBoardKey);
          saveStoredBoardKey(userBoardKey);
        }
      })
      .finally(() => {
        setIsAuthChecking(false);
      });
  }, []);

  // Sync tasks to LocalStorage
  useEffect(() => {
    saveStoredTasks(tasks);
  }, [tasks]);

  // Sync projects to LocalStorage
  useEffect(() => {
    saveStoredProjects(projects);
  }, [projects]);

  // Sync settings & sound manager
  useEffect(() => {
    saveStoredSettings(settings);
    soundManager.setEnabled(settings.soundEnabled);
  }, [settings]);

  // Load finance data only after the account is known. This prevents one user's
  // locally imported statements from appearing for another user on the same device.
  useEffect(() => {
    if (!currentUser) {
      setTransactions([]);
      setBudgets(DEFAULT_BUDGETS);
      setCategoryRules({});
      setCardMeta({});
      setAccounts([]);
      setUploadLogs([]);
      setFinanceOwnerId(null);
      return;
    }

    setTransactions(loadStoredTransactions(currentUser.id));
    setBudgets(loadStoredBudgets(currentUser.id));
    setCategoryRules(loadStoredCategoryRules(currentUser.id));
    setCardMeta(loadStoredCardMeta(currentUser.id));
    setAccounts(loadStoredAccounts(currentUser.id));
    setUploadLogs(loadStoredUploadLogs(currentUser.id));
    setFinanceOwnerId(currentUser.id);
  }, [currentUser]);

  // Sync finance data to this signed-in user's local storage only.
  useEffect(() => {
    if (currentUser && financeOwnerId === currentUser.id) {
      saveStoredTransactions(currentUser.id, transactions);
    }
  }, [transactions, currentUser, financeOwnerId]);

  useEffect(() => {
    if (currentUser && financeOwnerId === currentUser.id) {
      saveStoredBudgets(currentUser.id, budgets);
    }
  }, [budgets, currentUser, financeOwnerId]);

  useEffect(() => {
    if (currentUser && financeOwnerId === currentUser.id) {
      saveStoredCardMeta(currentUser.id, cardMeta);
    }
  }, [cardMeta, currentUser, financeOwnerId]);

  useEffect(() => {
    if (currentUser && financeOwnerId === currentUser.id) {
      saveStoredAccounts(currentUser.id, accounts);
    }
  }, [accounts, currentUser, financeOwnerId]);

  useEffect(() => {
    if (currentUser && financeOwnerId === currentUser.id) {
      saveStoredUploadLogs(currentUser.id, uploadLogs);
    }
  }, [uploadLogs, currentUser, financeOwnerId]);

  // Load server-persisted category rules and merge with local
  useEffect(() => {
    if (!currentUser || financeOwnerId !== currentUser.id) return;
    fetch('/api/expenses/rules')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.rules && Object.keys(data.rules).length > 0) {
          setCategoryRules((prev) => {
            const merged = { ...prev, ...data.rules };
            saveStoredCategoryRules(currentUser.id, merged);
            return merged;
          });
        }
      })
      .catch(() => {});
  }, [currentUser, financeOwnerId]);

  const handleSaveCategoryRule = useCallback((pattern: string, category: ExpenseCategory) => {
    if (!currentUser) return;
    setCategoryRules((prev) => {
      const updated = { ...prev, [pattern]: category };
      saveStoredCategoryRules(currentUser.id, updated);
      return updated;
    });

    fetch('/api/expenses/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pattern, category }),
    }).catch(() => {});
  }, [currentUser]);

  const handleSaveRulesBatch = useCallback((newRules: Record<string, ExpenseCategory>) => {
    if (!currentUser) return;
    setCategoryRules((prev) => {
      const updated = { ...prev, ...newRules };
      saveStoredCategoryRules(currentUser.id, updated);
      return updated;
    });

    fetch('/api/expenses/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: newRules }),
    }).catch(() => {});
  }, [currentUser]);

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
            if (result.data.tasks.length > 0 || tasks.length === 0 || isManual) {
              setTasks(result.data.tasks);
            }
          }
          if (result.data.settings) {
            setSettings(result.data.settings);
          }
          if (result.data.activeTaskId !== undefined) {
            setActiveTaskId(result.data.activeTaskId);
          }
          if (Array.isArray(result.data.projects)) {
            setProjects(result.data.projects);
            saveStoredProjects(result.data.projects);
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
          projects,
          updatedAt: Date.now(),
        });
      }
    } else {
      setSyncStatus(result.status);
    }
  }, [tasks, settings, activeTaskId, projects]);

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
        projects,
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
        if (Array.isArray(res.data.projects)) {
          setProjects(res.data.projects);
          saveStoredProjects(res.data.projects);
        }
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
  }, [tasks, settings, activeTaskId, projects, boardKey]);

  // Manual Force Push
  const handleForcePush = async () => {
    setSyncStatus('syncing');
    const res = await pushBoardToCloud(boardKey, {
      tasks,
      settings,
      activeTaskId,
      projects,
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
  const checkOffLinkedModuleItem = useCallback((completedTaskId: string) => {
    const targetTask = tasks.find((t) => t.id === completedTaskId);
    if (!targetTask?.linkedProjectId || !targetTask?.linkedScopeItemId) return;

    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== targetTask.linkedProjectId) return proj;
        return {
          ...proj,
          modules: proj.modules.map((mod) => {
            if (mod.id !== targetTask.linkedModuleId) return mod;
            const foundMissing = mod.missingItems.find((mi) => mi.id === targetTask.linkedScopeItemId);
            if (!foundMissing) return mod;
            return {
              ...mod,
              missingItems: mod.missingItems.filter((mi) => mi.id !== targetTask.linkedScopeItemId),
              doneItems: [
                ...mod.doneItems,
                {
                  ...foundMissing,
                  completed: true,
                  completedAt: Date.now(),
                },
              ],
              updatedAt: Date.now(),
            };
          }),
        };
      })
    );
  }, [tasks]);

  const revertLinkedModuleItemToMissing = useCallback((revertedTaskId: string) => {
    const targetTask = tasks.find((t) => t.id === revertedTaskId);
    if (!targetTask?.linkedProjectId || !targetTask?.linkedScopeItemId) return;

    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== targetTask.linkedProjectId) return proj;
        return {
          ...proj,
          modules: proj.modules.map((mod) => {
            if (mod.id !== targetTask.linkedModuleId) return mod;
            const foundDone = mod.doneItems.find((di) => di.id === targetTask.linkedScopeItemId);
            if (!foundDone) return mod;
            return {
              ...mod,
              doneItems: mod.doneItems.filter((di) => di.id !== targetTask.linkedScopeItemId),
              missingItems: [
                ...mod.missingItems,
                {
                  ...foundDone,
                  completed: false,
                  completedAt: undefined,
                },
              ],
              updatedAt: Date.now(),
            };
          }),
        };
      })
    );
  }, [tasks]);

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

    checkOffLinkedModuleItem(taskId);
    soundManager.playCompleteChime();
    triggerConfetti();
  }, [triggerConfetti, checkOffLinkedModuleItem]);

  // Task Move
  const handleMoveTask = useCallback((taskId: string, targetCol: ColumnId) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;

        const isMovingToDone = targetCol === 'done';
        const isMovingToDoing = targetCol === 'doing';
        const wasInDone = t.columnId === 'done';

        if (isMovingToDone) {
          checkOffLinkedModuleItem(taskId);
          soundManager.playCompleteChime();
          triggerConfetti();
        } else if (wasInDone) {
          revertLinkedModuleItemToMissing(taskId);
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
  }, [settings.autoStartTimerOnDoing, triggerConfetti, checkOffLinkedModuleItem, revertLinkedModuleItemToMissing]);

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

  // Update Task Color
  const handleUpdateTaskColor = useCallback((taskId: string, color: TaskColor) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, color } : t))
    );
  }, []);

  // Update Task Title (e.g. from AI Beautify)
  const handleUpdateTaskTitle = useCallback((taskId: string, newTitle: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, title: newTitle.trim() } : t))
    );
  }, []);

  // Quick Add Task in Column
  const handleQuickAddTask = useCallback((columnId: ColumnId, title: string, context?: TaskContext) => {
    const defaultCtx = context || (activeContext === 'personal' ? 'personal' : 'work');
    const nlp = parseNaturalLanguageDate(title);
    const finalTitle = nlp.hasMatch ? nlp.cleanTitle : title.trim();
    const finalDueDate = nlp.hasMatch ? (nlp.dueDate || undefined) : undefined;
    const finalHasSpecificTime = nlp.hasMatch ? nlp.hasSpecificTime : undefined;

    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: finalTitle,
      columnId,
      priority: 'medium',
      context: defaultCtx,
      subtasks: [],
      tags: [],
      elapsedSeconds: 0,
      isRunning: columnId === 'doing' && settings.autoStartTimerOnDoing,
      createdAt: Date.now(),
      dueDate: finalDueDate,
      hasSpecificTime: finalHasSpecificTime,
    };

    setTasks((prev) => [newTask, ...prev]);

    if (columnId === 'doing') {
      setActiveTaskId(newTask.id);
    }
  }, [settings.autoStartTimerOnDoing, activeContext]);

  // Delete Task
  const handleDeleteTask = useCallback((taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (activeTaskId === taskId) {
      setActiveTaskId(null);
    }

    // If task was linked to a project module, clear linkedTaskId so it can be re-sent if needed
    if (targetTask?.linkedProjectId && targetTask?.linkedScopeItemId) {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== targetTask.linkedProjectId) return proj;
          return {
            ...proj,
            modules: proj.modules.map((mod) => {
              if (mod.id !== targetTask.linkedModuleId) return mod;
              const clearLink = (item: ModuleScopeItem) =>
                item.id === targetTask.linkedScopeItemId ? { ...item, linkedTaskId: undefined } : item;
              return {
                ...mod,
                missingItems: mod.missingItems.map(clearLink),
                doneItems: mod.doneItems.map(clearLink),
                updatedAt: Date.now(),
              };
            }),
          };
        })
      );
    }
  }, [activeTaskId, tasks]);

  // Save / Edit Task from Modal
  const handleSaveTaskModal = useCallback((taskData: Partial<Task>) => {
    if (editingTask) {
      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? { ...t, ...taskData } : t))
      );

      // If this task is linked to a project scope item, sync comments/description and title back to project area!
      if (editingTask.linkedProjectId && editingTask.linkedScopeItemId) {
        setProjects((prevProjects) =>
          prevProjects.map((p) => {
            if (p.id !== editingTask.linkedProjectId) return p;
            return {
              ...p,
              modules: p.modules.map((m) => {
                if (m.id !== editingTask.linkedModuleId) return m;

                let cleanTitle = taskData.title;
                if (cleanTitle) {
                  const prefixMatch = cleanTitle.match(/^\[.*?\]\s*(.*)$/);
                  if (prefixMatch) cleanTitle = prefixMatch[1];
                }

                const syncItem = (it: ModuleScopeItem) => {
                  if (it.id !== editingTask.linkedScopeItemId) return it;
                  return {
                    ...it,
                    title: cleanTitle ? cleanTitle.trim() : it.title,
                    details: taskData.description !== undefined ? taskData.description : it.details,
                    updatedAt: Date.now(),
                  };
                };

                return {
                  ...m,
                  missingItems: m.missingItems.map(syncItem),
                  doneItems: m.doneItems.map(syncItem),
                  updatedAt: Date.now(),
                };
              }),
            };
          })
        );
      }
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

  // Update Scope Item directly from Project Management area
  const handleUpdateScopeItem = useCallback((
    module: ProjectModule,
    item: ModuleScopeItem,
    newTitle: string,
    newDetails?: string
  ) => {
    // 1. Update in projects state
    setProjects((prevProjects) =>
      prevProjects.map((p) =>
        p.id === module.projectId
          ? {
              ...p,
              modules: p.modules.map((m) => {
                if (m.id !== module.id) return m;
                const updateList = (list: ModuleScopeItem[]) =>
                  list.map((it) =>
                    it.id === item.id
                      ? { ...it, title: newTitle, details: newDetails, updatedAt: Date.now() }
                      : it
                  );
                return {
                  ...m,
                  missingItems: updateList(m.missingItems),
                  doneItems: updateList(m.doneItems),
                  updatedAt: Date.now(),
                };
              }),
            }
          : p
      )
    );

    // 2. If this item has a linked task on the Kanban board, sync changes directly back to the task!
    if (item.linkedTaskId) {
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === item.linkedTaskId
            ? {
                ...t,
                title: `[${module.name}] ${newTitle}`,
                description: newDetails !== undefined ? newDetails : t.description,
              }
            : t
        )
      );
    }
  }, []);

  // WIP Violation Trigger
  const handleWipViolation = useCallback((task: Task) => {
    soundManager.playWipWarning();
    setWipViolationTask(task);
  }, []);

  // 1-Click Promote Missing Scope Item from Project Management to Kanban Board
  const handlePromoteScopeItemToTask = useCallback((module: ProjectModule, item: ModuleScopeItem) => {
    const tagPrefix = module.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: `[${module.name}] ${item.title}`,
      description: `Deliverable for ${module.name} (${module.version || 'v0.1'}).\n${module.summary || ''}`,
      columnId: 'today',
      priority: 'high',
      context: activeContext === 'personal' ? 'personal' : 'work',
      subtasks: [],
      tags: ['Module', tagPrefix],
      elapsedSeconds: 0,
      isRunning: false,
      createdAt: Date.now(),
      linkedProjectId: module.projectId,
      linkedModuleId: module.id,
      linkedScopeItemId: item.id,
    };

    setTasks((prev) => [newTask, ...prev]);

    // Update item's linkedTaskId in projects
    setProjects((prevProjects) =>
      prevProjects.map((p) =>
        p.id === module.projectId
          ? {
              ...p,
              modules: p.modules.map((m) =>
                m.id === module.id
                  ? {
                      ...m,
                      missingItems: m.missingItems.map((ms) =>
                        ms.id === item.id ? { ...ms, linkedTaskId: newTask.id } : ms
                      ),
                      updatedAt: Date.now(),
                    }
                  : m
              ),
            }
          : p
      )
    );

    soundManager.playSubtaskCheck();
  }, [activeContext]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setActiveTab('tasks');
      } else if (e.altKey && e.key === '2') {
        e.preventDefault();
        setActiveTab('expenses');
      } else if (e.altKey && e.key === '3') {
        e.preventDefault();
        setActiveTab('projects');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setEditingTask(null);
        setDefaultColumnForNew('backlog');
        setIsTaskModalOpen(true);
      } else if (!isInput && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setEditingTask(null);
        setDefaultColumnForNew('backlog');
        setIsTaskModalOpen(true);
      } else if (e.key === 'Escape') {
        setIsTaskModalOpen(false);
        setWipViolationTask(null);
        setIsCloudSyncModalOpen(false);
        setIsAuthModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Loading Gate while checking active session
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-offwhite-bg dark:bg-[#090a0f] flex flex-col items-center justify-center text-zinc-600 dark:text-zinc-400 gap-3">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/25 animate-pulse">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
          <span>Starting Headroom...</span>
        </div>
      </div>
    );
  }

  // Authentication Gate: Require user to sign in or register before accessing the workspace
  if (!currentUser) {
    return <LoginPage onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-offwhite-bg dark:bg-[#090a0f] text-zinc-800 dark:text-zinc-100 flex flex-col selection:bg-brand-500/30 selection:text-brand-700 dark:selection:text-brand-200 transition-colors duration-200">
      {/* Persistent Focus HUD */}
      <FocusHUD
        activeTab={activeTab}
        onSelectTab={setActiveTab}
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
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area (Kanban vs Projects vs Financial Headroom) */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'tasks' ? (
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
            onUpdateColor={handleUpdateTaskColor}
            onUpdateTitle={handleUpdateTaskTitle}
            onQuickAddTask={handleQuickAddTask}
            onToggleTimer={handleToggleTimer}
            onFocusTask={(taskId) => setActiveTaskId(taskId)}
            onWipViolation={handleWipViolation}
          />
        ) : activeTab === 'projects' ? (
          <ProjectManagementDashboard
            projects={projects}
            tasks={tasks}
            onUpdateProjects={setProjects}
            onPromoteToKanban={handlePromoteScopeItemToTask}
            onUpdateScopeItem={handleUpdateScopeItem}
          />
        ) : (
          <ExpenseDashboard
            transactions={transactions}
            onUpdateTransactions={setTransactions}
            budgets={budgets}
            onUpdateBudgets={setBudgets}
            categoryRules={categoryRules}
            onSaveRule={handleSaveCategoryRule}
            onSaveRulesBatch={handleSaveRulesBatch}
            cardMeta={cardMeta}
            onUpdateCardMeta={setCardMeta}
            accounts={accounts}
            onUpdateAccounts={setAccounts}
            uploadLogs={uploadLogs}
            onUpdateUploadLogs={setUploadLogs}
          />
        )}
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

      {/* User Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Account Profile & Recovery Birthday Modal */}
      {currentUser && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          onUserUpdated={(updatedUser) => setCurrentUser(updatedUser)}
        />
      )}
    </div>
  );
};
