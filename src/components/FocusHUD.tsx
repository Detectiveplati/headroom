import React, { useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  Plus, 
  Sparkles, 
  Clock, 
  AlertTriangle,
  Cloud,
  CloudOff,
  RefreshCw,
  Briefcase,
  Home,
  Layers,
  Sun,
  Moon,
  Monitor,
  User as UserIcon,
  LogOut,
  Wallet,
  CheckSquare
} from 'lucide-react';
import { Task, AppSettings, TaskContext, ThemeMode, User, ActiveTab } from '../types';
import { SyncStatus } from '../utils/sync';

interface FocusHUDProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeTask: Task | null;
  doingTasks: Task[];
  syncStatus: SyncStatus;
  onOpenSyncModal: () => void;
  onSelectActiveTask: (taskId: string) => void;
  onToggleTimer: (taskId: string) => void;
  onResetTimer: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onOpenNewTaskModal: () => void;
  onOpenTaskModal: (task: Task) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  activeContext: TaskContext | 'all';
  onSelectContext: (context: TaskContext | 'all') => void;
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const FocusHUD: React.FC<FocusHUDProps> = ({
  activeTab,
  onSelectTab,
  activeTask,
  doingTasks,
  syncStatus,
  onOpenSyncModal,
  onSelectActiveTask,
  onToggleTimer,
  onResetTimer,
  onCompleteTask,
  onOpenNewTaskModal,
  onOpenTaskModal,
  settings,
  onUpdateSettings,
  activeContext,
  onSelectContext,
  currentUser,
  onOpenAuthModal,
  onLogout,
}) => {
  // Local active timer increment for smooth 1-second ticks
  const [displaySeconds, setDisplaySeconds] = useState(activeTask?.elapsedSeconds || 0);

  useEffect(() => {
    setDisplaySeconds(activeTask?.elapsedSeconds || 0);
  }, [activeTask?.id, activeTask?.elapsedSeconds]);

  useEffect(() => {
    if (!activeTask || !activeTask.isRunning) return;

    const interval = setInterval(() => {
      setDisplaySeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTask?.id, activeTask?.isRunning]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/30';
      case 'high':
        return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30';
      case 'medium':
        return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30';
      default:
        return 'bg-zinc-200 dark:bg-zinc-700/40 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-600/30';
    }
  };

  const handleCycleTheme = () => {
    const current = settings.theme || 'system';
    let next: ThemeMode = 'dark';
    if (current === 'system') next = 'dark';
    else if (current === 'dark') next = 'light';
    else next = 'system';
    onUpdateSettings({ theme: next });
  };

  const completedSubtasks = activeTask?.subtasks.filter((st) => st.completed).length || 0;
  const totalSubtasks = activeTask?.subtasks.length || 0;
  const wipCount = doingTasks.length;
  const isWipAtCapacity = wipCount >= settings.wipLimit;

  return (
    <header className="sticky top-0 z-40 w-full bg-offwhite-surface/95 dark:bg-[#0d0f16]/90 backdrop-blur-md border-b border-zinc-300/80 dark:border-zinc-800/80 shadow-sm dark:shadow-2xl transition-all pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Product and module navigation */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-start flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 ring-1 ring-white/10">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-wide text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                Headroom
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-500/30">
                  v1.2
                </span>
              </span>
            </div>
          </div>

          {/* Module Switcher: Board vs Expenses */}
          <div className="flex items-center bg-offwhite-subtle dark:bg-zinc-900/90 border border-zinc-300/70 dark:border-zinc-800 p-0.5 rounded-xl text-xs font-medium shadow-sm">
            <button
              onClick={() => onSelectTab('tasks')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition text-[11px] ${
                activeTab === 'tasks'
                  ? 'bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
              title="Kanban Focus Board (Alt+1)"
            >
              <CheckSquare className="w-3 h-3" />
              <span>Board</span>
            </button>
            <button
              onClick={() => onSelectTab('expenses')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition text-[11px] ${
                activeTab === 'expenses'
                  ? 'bg-brand-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
              title="Expenses & Budget Cockpit (Alt+2)"
            >
              <Wallet className="w-3 h-3" />
              <span>Expenses</span>
            </button>
          </div>

          {activeTab === 'tasks' && (
            <>
              <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-800 hidden sm:block" />

              {/* Board-only context filter */}
              <div className="flex items-center bg-offwhite-subtle dark:bg-zinc-900/90 border border-zinc-300/70 dark:border-zinc-800 p-0.5 rounded-xl text-xs font-medium">
                <button
                  onClick={() => onSelectContext('work')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition text-[11px] ${activeContext === 'work' ? 'bg-brand-600 text-white font-semibold shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
                  title="Filter to Work tasks only"
                >
                  <Briefcase className="w-3 h-3" />
                  <span>Work</span>
                </button>
                <button
                  onClick={() => onSelectContext('personal')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition text-[11px] ${activeContext === 'personal' ? 'bg-brand-600 text-white font-semibold shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
                  title="Filter to Personal/Home tasks only"
                >
                  <Home className="w-3 h-3" />
                  <span>Personal</span>
                </button>
                <button
                  onClick={() => onSelectContext('all')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg transition text-[11px] ${activeContext === 'all' ? 'bg-brand-600 text-white font-semibold shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
                  title="Show all tasks"
                >
                  <Layers className="w-3 h-3" />
                </button>
              </div>

              {/* Board-only WIP gauge */}
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${isWipAtCapacity ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40' : 'bg-offwhite-subtle dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-zinc-300/70 dark:border-zinc-700/50'}`}
                title={`WIP Limit: ${wipCount} of ${settings.wipLimit} active slots used.`}
              >
                {isWipAtCapacity && <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                <span className="text-zinc-500 text-[10px]">WIP:</span>
                <span className="font-mono font-semibold">{wipCount}/{settings.wipLimit}</span>
              </div>
            </>
          )}

          {/* Cloud Sync Status Indicator */}
          <button
            type="button"
            onClick={onOpenSyncModal}
            aria-label={`Cloud Sync: ${syncStatus}. Open sync controls.`}
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
              syncStatus === 'synced'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/25'
                : syncStatus === 'syncing'
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35 hover:bg-amber-500/25'
                : 'bg-offwhite-subtle dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-300/70 dark:border-zinc-700/60'
            }`}
            title={`Cloud Sync: ${syncStatus}. Click to manage private board key or sync.`}
          >
            {syncStatus === 'synced' && <Cloud className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
            {syncStatus === 'syncing' && <RefreshCw className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-spin" />}
            {syncStatus !== 'synced' && syncStatus !== 'syncing' && <CloudOff className="w-3 h-3 text-zinc-500" />}
          </button>
        </div>

        {/* Center: Primary focus is intentionally board-only. */}
        {activeTab === 'tasks' && <div className="flex-1 w-full md:w-auto flex items-center justify-center">
          {activeTask ? (
            <div className="flex items-center gap-3 bg-offwhite-card dark:bg-zinc-900/90 border border-brand-500/40 px-3.5 py-1.5 rounded-xl shadow-md shadow-brand-500/10 max-w-2xl w-full justify-between animate-fadeIn">
              <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                <div className="relative flex items-center justify-center shrink-0">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>

                <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${getPriorityBadgeClass(activeTask.priority)}`}>
                  {activeTask.priority}
                </span>

                <button 
                  onClick={() => onOpenTaskModal(activeTask)}
                  className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 hover:text-brand-500 dark:hover:text-brand-300 transition truncate text-left focus:outline-none"
                  title="Click to view details"
                >
                  {activeTask.title}
                </button>

                {totalSubtasks > 0 && (
                  <span className="hidden sm:inline-flex text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-offwhite-subtle dark:bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-300/80 dark:border-zinc-700/50 whitespace-nowrap">
                    {completedSubtasks}/{totalSubtasks}
                  </span>
                )}

                {doingTasks.length > 1 && (
                  <div className="hidden lg:flex items-center gap-1 border-l border-zinc-300 dark:border-zinc-800 pl-2">
                    {doingTasks.map((t, idx) => (
                      <button
                        key={t.id}
                        onClick={() => onSelectActiveTask(t.id)}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono transition ${
                          t.id === activeTask.id
                            ? 'bg-brand-500/30 text-brand-700 dark:text-brand-200 border border-brand-400/40 font-bold'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 bg-offwhite-subtle dark:bg-zinc-800/40'
                        }`}
                        title={`Switch focus to: ${t.title}`}
                      >
                        #{idx + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Timer Controls & Quick Complete */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 bg-offwhite-subtle dark:bg-zinc-950/70 border border-zinc-300/80 dark:border-zinc-800 px-2 py-1 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  <span className="font-mono text-xs sm:text-sm font-medium text-brand-700 dark:text-brand-200 min-w-[45px] text-center">
                    {formatTime(displaySeconds)}
                  </span>
                  <button
                    onClick={() => onToggleTimer(activeTask.id)}
                    className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded hover:bg-offwhite-surface dark:hover:bg-zinc-800 transition"
                    title={activeTask.isRunning ? "Pause timer" : "Start timer"}
                  >
                    {activeTask.isRunning ? (
                      <Pause className="w-3 h-3 text-amber-500" />
                    ) : (
                      <Play className="w-3 h-3 text-emerald-600 fill-emerald-600 dark:text-emerald-500 dark:fill-emerald-500" />
                    )}
                  </button>
                  <button
                    onClick={() => onResetTimer(activeTask.id)}
                    className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 rounded hover:bg-offwhite-surface dark:hover:bg-zinc-800 transition"
                    title="Reset timer"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>

                <button
                  onClick={() => onCompleteTask(activeTask.id)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-2.5 py-1.5 rounded-lg shadow-sm transition active:scale-95"
                  title="Mark active task as Done"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Complete</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-1.5 px-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs w-full max-w-lg bg-offwhite-surface/70 dark:bg-zinc-900/40">
              <span>No active focus task in this view.</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">Drag a card into "In Progress"</span>
            </div>
          )}
        </div>}

        {/* Right: User account, Theme, New Task & Controls */}
        <div className="flex items-center gap-1.5 w-full md:w-auto justify-end">
          {/* User Account / Sign In */}
          {currentUser ? (
            <div className="flex items-center gap-1 bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-300/70 dark:border-zinc-800 px-2 py-1 rounded-lg text-xs font-mono">
              <span className="text-brand-700 dark:text-brand-400 font-semibold">{currentUser.username}</span>
              <button
                onClick={onLogout}
                className="p-1 text-zinc-400 hover:text-red-500 transition"
                title="Log out"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-brand-600 bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-300/70 dark:border-zinc-800 px-2.5 py-1.5 rounded-lg transition"
              title="Sign In or Create an Account"
            >
              <UserIcon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-500" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          {/* Theme Toggle (System / Dark / Light) */}
          <button
            onClick={handleCycleTheme}
            className="p-1.5 rounded-lg border border-zinc-300/70 dark:border-zinc-800 bg-offwhite-subtle dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-brand-500 transition"
            title={`Current theme: ${settings.theme || 'system'}. Click to cycle (System -> Dark -> Light).`}
          >
            {(settings.theme || 'system') === 'system' && <Monitor className="w-3.5 h-3.5" />}
            {settings.theme === 'dark' && <Moon className="w-3.5 h-3.5" />}
            {settings.theme === 'light' && <Sun className="w-3.5 h-3.5 text-amber-600" />}
          </button>

          {activeTab === 'tasks' && (
            <button
              onClick={onOpenNewTaskModal}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg shadow-lg shadow-brand-600/20 transition active:scale-95"
              title="Create new task (Ctrl+K or N)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
