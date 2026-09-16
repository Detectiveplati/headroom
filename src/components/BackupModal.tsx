import React, { useState } from 'react';
import { X, Download, Upload, Copy, Check, RotateCcw, AlertTriangle, FileText } from 'lucide-react';
import { Task, AppSettings } from '../types';
import { exportBoardData, importBoardData, STARTER_TASKS } from '../utils/storage';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  settings: AppSettings;
  onRestoreData: (tasks: Task[], settings?: AppSettings) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  tasks,
  settings,
  onRestoreData,
}) => {
  const [pastedJson, setPastedJson] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  if (!isOpen) return null;

  const handleCopy = () => {
    const payload = JSON.stringify({ version: '1.0', tasks, settings }, null, 2);
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = importBoardData(text);
        onRestoreData(data.tasks, data.settings);
        onClose();
      } catch (err: unknown) {
        setErrorMsg((err as Error).message || 'Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handlePastedImport = () => {
    if (!pastedJson.trim()) return;
    try {
      setErrorMsg(null);
      const data = importBoardData(pastedJson.trim());
      onRestoreData(data.tasks, data.settings);
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to parse JSON');
    }
  };

  const handleResetToDemo = () => {
    if (window.confirm('Reset board back to default starter tasks? This will overwrite current tasks.')) {
      onRestoreData(STARTER_TASKS);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-offwhite-surface dark:bg-[#12151e] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-offwhite-subtle/60 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-offwhite-card dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Data Backup & Sync
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-lg hover:bg-offwhite-subtle dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-offwhite-subtle/40 dark:bg-zinc-950/20 text-xs">
          <button
            onClick={() => { setActiveTab('export'); setErrorMsg(null); }}
            className={`flex-1 py-2.5 font-medium border-b-2 transition ${
              activeTab === 'export'
                ? 'border-brand-500 text-brand-600 dark:text-brand-300 bg-brand-500/10'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Export Backup
          </button>
          <button
            onClick={() => { setActiveTab('import'); setErrorMsg(null); }}
            className={`flex-1 py-2.5 font-medium border-b-2 transition ${
              activeTab === 'import'
                ? 'border-brand-500 text-brand-600 dark:text-brand-300 bg-brand-500/10'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Import / Restore
          </button>
        </div>

        {/* Body */}
        <div className="p-5 text-xs text-zinc-600 dark:text-zinc-300 space-y-4">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Your tasks are automatically saved in local storage. You can also download a JSON file or copy it to your clipboard for safe-keeping.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => exportBoardData(tasks, settings)}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-brand-500/20 transition active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .json</span>
                </button>

                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 bg-offwhite-card hover:bg-offwhite-subtle dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 transition shadow-xs"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                </button>
              </div>

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={handleResetToDemo}
                  className="text-[11px] text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore Starter Demo Tasks</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-zinc-600 dark:text-zinc-400">
                Upload a Headroom backup JSON or paste JSON text below to restore your board:
              </p>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Upload file
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileImport}
                  className="block w-full text-xs text-zinc-600 dark:text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-800 dark:file:text-zinc-200 hover:file:bg-zinc-200 dark:hover:file:bg-zinc-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Or paste JSON text:
                </label>
                <textarea
                  rows={4}
                  placeholder='{"tasks": [...]}'
                  value={pastedJson}
                  onChange={(e) => setPastedJson(e.target.value)}
                  className="w-full text-xs font-mono bg-offwhite-input dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl p-2.5 text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <button
                onClick={handlePastedImport}
                disabled={!pastedJson.trim()}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2 rounded-xl transition"
              >
                <Upload className="w-4 h-4" />
                <span>Parse & Restore Data</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-offwhite-subtle/60 dark:bg-zinc-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-4 py-1.5 rounded-lg hover:bg-offwhite-subtle dark:hover:bg-zinc-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
