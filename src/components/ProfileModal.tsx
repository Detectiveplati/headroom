import React, { useState } from 'react';
import { X, Calendar, KeyRound, CheckCircle2, AlertCircle, Loader2, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import { updateBirthdayApi } from '../utils/auth';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUserUpdated: (user: User) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}) => {
  const [birthday, setBirthday] = useState(currentUser.birthday || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthday) {
      setErrorMsg('Please select a valid date.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updatedUser = await updateBirthdayApi(birthday);
      onUserUpdated(updatedUser);
      setSuccessMsg('Recovery birthday saved successfully!');
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3000);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to update birthday');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-offwhite-surface dark:bg-[#12151e] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-offwhite-subtle/60 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <UserIcon className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold">Account Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-lg hover:bg-offwhite-subtle dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-zinc-500 dark:text-zinc-400 text-[11px] mb-1">
              Username
            </label>
            <div className="px-3 py-2 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono font-medium text-brand-600 dark:text-brand-400">
              {currentUser.username}
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="block font-medium text-zinc-700 dark:text-zinc-300">
                Password Recovery Birthday
              </label>
              <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>YYYY-MM-DD</span>
              </span>
            </div>

            {!currentUser.birthday ? (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-[11px] flex items-start gap-2">
                <KeyRound className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  No recovery birthday is on file. Add it now to enable resetting your password if you ever forget it.
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                This birthday is used to verify your identity when using the password reset feature.
              </div>
            )}

            <input
              type="date"
              required
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full text-xs bg-offwhite-input dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />

            <button
              type="submit"
              disabled={isLoading || !birthday}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium py-2 rounded-xl shadow-lg shadow-brand-500/20 transition active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Recovery Birthday</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
