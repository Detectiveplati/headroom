import React, { useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  Plus, 
  Sparkles, 
  Clock, 
  Volume2, 
  VolumeX, 
  FileDown, 
  Keyboard,
  AlertTriangle,
  Cloud,
  CloudOff,
  RefreshCw
} from 'lucide-react';
import { Task, AppSettings } from '../types';
import { SyncStatus } from '../utils/sync';

interface FocusHUDProps {
  activeTask: Task | null;
  doingTasks: Task[];
  syncStatus: SyncStatus;
  onOpenSyncModal: () => void;
  onSelectActiveTask: (taskId: string) => void;
  onToggleTimer: (taskId: string) => void;
  onResetTimer: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onOpenNewTaskModal: () => void;
  onOpenBackupModal: () => void;
  onOpenShortcutsModal: () => void;
  onOpenTaskModal: (task: Task) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const FocusHUD: React.FC<FocusHUDProps> = ({
  activeTask,
  doingTasks,
  syncStatus,
  onOpenSyncModal,
  onSelectActiveTask,
  onToggleTimer,
  onResetTimer,
  onCompleteTask,
  onOpenNewTaskModal,
  onOpenBackupModal,
  onOpenShortcutsModal,
  onOpenTaskModal,
  settings,
  onUpdateSettings,
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
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'high':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'medium':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      default:
        return 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/30';
    }
  };

  const completedSubtasks = activeTask?.subtasks.filter((st) => st.completed).length || 0;
  const totalSubtasks = activeTask?.subtasks.length || 0;
  const wipCount = doingTasks.length;
  const isWipAtCapacity = wipCount >= settings.wipLimit;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0d0f16]/90 backdrop-blur-md border-b border-zinc-800/80 shadow-2xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Brand & WIP status indicator */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 ring-1 ring-white/10">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-wide text-zinc-100 flex items-center gap-1.5">
                Headroom
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  v1.0
                </span>
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* WIP Gauge */}
          <div 
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              isWipAtCapacity
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-zinc-800/50 text-zinc-300 border-zinc-700/50'
            }`}
            title={`WIP Limit: ${wipCount} of ${settings.wipLimit} active slots used. Keep WIP low to prevent attention fragmentation!`}
          >
            {isWipAtCapacity && <AlertTriangle className="w-3 h-3 text-amber-400" />}
            <span className="text-zinc-400 text-[11px]">WIP:</span>
            <span className="font-mono font-semibold">{wipCount}/{settings.wipLimit}</span>
            {isWipAtCapacity && <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">FULL</span>}
          </div>

          {/* Cloud Sync Status Indicator */}
          <button
            type="button"
            onClick={onOpenSyncModal}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              syncStatus === 'synced'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : syncStatus === 'syncing'
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/60 hover:bg-zinc-800'
            }`}
            title={`Cloud Sync: ${syncStatus}. Click to manage private board key or sync.`}
          >
            {syncStatus === 'synced' && <Cloud className="w-3 h-3 text-emerald-400" />}
            {syncStatus === 'syncing' && <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />}
            {syncStatus !== 'synced' && syncStatus !== 'syncing' && <CloudOff className="w-3 h-3 text-zinc-500" />}
            <span className="hidden sm:inline font-mono text-[11px] capitalize">{syncStatus}</span>
          </button>
        </div>

        {/* Center: Primary Focus HUD */}
        <div className="flex-1 w-full md:w-auto flex items-center justify-center">
          {activeTask ? (
            <div className="flex items-center gap-3 bg-zinc-900/90 border border-brand-500/40 px-3.5 py-1.5 rounded-xl shadow-lg shadow-brand-500/10 max-w-2xl w-full justify-between animate-fadeIn">
              <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                <div className="relative flex items-center justify-center">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>

                <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded font-bold ${getPriorityBadgeClass(activeTask.priority)}`}>
                  {activeTask.priority}
                </span>

                <button 
                  onClick={() => onOpenTaskModal(activeTask)}
                  className="font-medium text-xs sm:text-sm text-zinc-100 hover:text-brand-300 transition truncate text-left focus:outline-none"
                  title="Click to view details"
                >
                  {activeTask.title}
                </button>

                {totalSubtasks > 0 && (
                  <span className="hidden sm:inline-flex text-[11px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/50 whitespace-nowrap">
                    {completedSubtasks}/{totalSubtasks}
                  </span>
                )}

                {/* Multiple doing tasks selector if WIP > 1 */}
                {doingTasks.length > 1 && (
                  <div className="hidden lg:flex items-center gap-1 border-l border-zinc-800 pl-2">
                    {doingTasks.map((t, idx) => (
                      <button
                        key={t.id}
                        onClick={() => onSelectActiveTask(t.id)}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition ${
                          t.id === activeTask.id
                            ? 'bg-brand-500/30 text-brand-200 border border-brand-400/40 font-bold'
                            : 'text-zinc-500 hover:text-zinc-300 bg-zinc-800/40'
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
                <div className="flex items-center gap-1 bg-zinc-950/70 border border-zinc-800 px-2 py-1 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-brand-400" />
                  <span className="font-mono text-xs sm:text-sm font-medium text-brand-200 min-w-[50px] text-center">
                    {formatTime(displaySeconds)}
                  </span>
                  <button
                    onClick={() => onToggleTimer(activeTask.id)}
                    className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition"
                    title={activeTask.isRunning ? "Pause timer" : "Start timer"}
                  >
                    {activeTask.isRunning ? (
                      <Pause className="w-3 h-3 text-amber-400" />
                    ) : (
                      <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                    )}
                  </button>
                  <button
                    onClick={() => onResetTimer(activeTask.id)}
                    className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800 transition"
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
            <div className="flex items-center justify-center gap-2 py-1.5 px-4 rounded-xl border border-dashed border-zinc-800 text-zinc-400 text-xs w-full max-w-lg bg-zinc-900/40">
              <span className="text-zinc-500">No active focus task.</span>
              <span className="text-zinc-300 font-medium">Drag a card into "In Progress"</span>
              <span className="text-zinc-500">to start your flow session.</span>
            </div>
          )}
        </div>

        {/* Right: Quick actions & App settings */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={onOpenNewTaskModal}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs px-3 py-1.5 rounded-lg shadow-lg shadow-brand-600/20 transition hover:shadow-brand-500/40 active:scale-95"
            title="Create new task (Ctrl+K or N)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
            <kbd className="hidden lg:inline-block font-mono text-[9px] bg-brand-800/80 px-1 py-0.5 rounded text-brand-200">
              Ctrl+K
            </kbd>
          </button>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* Audio toggle */}
          <button
            onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
            className={`p-1.5 rounded-lg border transition ${
              settings.soundEnabled 
                ? 'bg-zinc-800/80 border-zinc-700/70 text-zinc-300 hover:text-white' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:text-zinc-400'
            }`}
            title={settings.soundEnabled ? "Mute sound effects" : "Enable sound effects"}
          >
            {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Backup Modal */}
          <button
            onClick={onOpenBackupModal}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition"
            title="Export / Import JSON Data"
          >
            <FileDown className="w-3.5 h-3.5" />
          </button>

          {/* Keyboard Shortcuts */}
          <button
            onClick={onOpenShortcutsModal}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </header>
  );
};
