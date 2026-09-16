import React, { useState } from 'react';
import { X, Cloud, CloudOff, RefreshCw, Key, Check, CloudDownload, CloudUpload, ShieldCheck } from 'lucide-react';
import { SyncStatus } from '../utils/sync';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SyncStatus;
  currentBoardKey: string;
  lastSyncedTimestamp: number | null;
  onUpdateBoardKey: (newKey: string) => void;
  onForcePull: () => void;
  onForcePush: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  syncStatus,
  currentBoardKey,
  lastSyncedTimestamp,
  onUpdateBoardKey,
  onForcePull,
  onForcePush,
}) => {
  const [boardKeyInput, setBoardKeyInput] = useState(currentBoardKey);
  const [keySaved, setKeySaved] = useState(false);

  if (!isOpen) return null;

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = boardKeyInput.trim() || 'default';
    onUpdateBoardKey(cleanKey);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const formatLastSynced = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 5) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#12151e] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Cloud className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Cloud Synchronization
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 text-xs text-zinc-600 dark:text-zinc-300 space-y-4">
          {/* Status Banner */}
          <div className="p-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {syncStatus === 'synced' ? (
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <Cloud className="w-4 h-4" />
                </div>
              ) : syncStatus === 'syncing' ? (
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                </div>
              ) : (
                <div className="p-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">
                  <CloudOff className="w-4 h-4" />
                </div>
              )}

              <div>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 block capitalize">
                  {syncStatus === 'synced' && 'Cloud Sync Active'}
                  {syncStatus === 'syncing' && 'Synchronizing Changes...'}
                  {syncStatus === 'offline' && 'Offline / Local Cache'}
                  {syncStatus === 'error' && 'Sync Error / Connecting...'}
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">
                  Last synced: {formatLastSynced(lastSyncedTimestamp)}
                </span>
              </div>
            </div>

            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              syncStatus === 'synced'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : syncStatus === 'syncing'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
            }`}>
              {syncStatus.toUpperCase()}
            </span>
          </div>

          {/* Board Key Form */}
          <form onSubmit={handleSaveKey} className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <Key className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span>Private Board Key / Passphrase</span>
            </label>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Enter the same key on your phone, laptop, or other browsers to share this exact board.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. zack-focus or default"
                value={boardKeyInput}
                onChange={(e) => setBoardKeyInput(e.target.value)}
                className="flex-1 text-xs font-mono bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <button
                type="submit"
                className="text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-2 rounded-xl transition flex items-center gap-1"
              >
                {keySaved ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : null}
                <span>{keySaved ? 'Saved' : 'Set Key'}</span>
              </button>
            </div>
          </form>

          {/* Manual Sync Actions */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Manual Sync Actions
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onForcePull}
                className="flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 py-2 px-3 rounded-xl transition"
                title="Fetch the latest board from cloud and update local board"
              >
                <CloudDownload className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                <span>Pull Latest</span>
              </button>

              <button
                type="button"
                onClick={onForcePush}
                className="flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 py-2 px-3 rounded-xl transition"
                title="Force local board state to overwrite cloud"
              >
                <CloudUpload className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span>Push Local</span>
              </button>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 flex items-start gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Local-First:</strong> You can continue working even when disconnected. Changes queue locally and automatically sync the moment connection returns.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium px-4 py-1.5 rounded-xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
