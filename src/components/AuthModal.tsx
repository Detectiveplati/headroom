import React, { useState } from 'react';
import { X, UserCheck, UserPlus, LogIn, AlertCircle, Loader2, KeyRound, Calendar, CheckCircle2 } from 'lucide-react';
import { User } from '../types';
import { loginApi, registerApi, resetPasswordApi } from '../utils/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register' | 'reset'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [birthday, setBirthday] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (tab === 'login') {
        const { user } = await loginApi(username, password);
        onSuccess(user);
        onClose();
      } else if (tab === 'register') {
        if (!birthday) {
          throw new Error('Please enter your birthday for password recovery.');
        }
        const { user } = await registerApi(username, password, birthday);
        onSuccess(user);
        onClose();
      } else {
        if (!birthday) {
          throw new Error('Please enter your registered birthday.');
        }
        if (password.length < 4) {
          throw new Error('New password must be at least 4 characters long.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        const { user } = await resetPasswordApi(username, birthday, password);
        setSuccessMsg('Password reset successfully!');
        setTimeout(() => {
          onSuccess(user);
          onClose();
        }, 800);
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Authentication error');
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
              {tab === 'login' ? <LogIn className="w-4 h-4" /> : tab === 'register' ? <UserPlus className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
            </div>
            <h3 className="text-base font-semibold">
              {tab === 'login' ? 'Sign In to Headroom' : tab === 'register' ? 'Create an Account' : 'Reset Password'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-lg hover:bg-offwhite-subtle dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-offwhite-subtle/40 dark:bg-zinc-950/20 text-xs">
          <button
            type="button"
            onClick={() => { setTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2.5 font-medium border-b-2 transition ${
              tab === 'login'
                ? 'border-brand-500 text-brand-600 dark:text-brand-300 bg-brand-500/10'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2.5 font-medium border-b-2 transition ${
              tab === 'register'
                ? 'border-brand-500 text-brand-600 dark:text-brand-300 bg-brand-500/10'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Create Account
          </button>
          {tab === 'reset' && (
            <div
              className="flex-1 py-2.5 font-medium border-b-2 border-amber-500 text-amber-600 dark:text-amber-300 bg-amber-500/10 text-center"
            >
              Reset
            </div>
          )}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
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

          {tab === 'reset' && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>Enter your registered birthday to reset your account password.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. zack"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full text-xs bg-offwhite-input dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
          </div>

          {(tab === 'register' || tab === 'reset') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {tab === 'register' ? 'Birthday (for recovery)' : 'Registered Birthday'}
                </label>
                <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>YYYY-MM-DD</span>
                </span>
              </div>
              <input
                type="date"
                required
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full text-xs bg-offwhite-input dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
          )}

          {tab === 'login' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setTab('reset'); setErrorMsg(null); setSuccessMsg(null); }}
                  className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs bg-offwhite-input dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  autoComplete="current-password"
                />
              </div>
            </div>
          )}

          {tab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs bg-offwhite-input dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {tab === 'reset' && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password (min. 4 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs bg-offwhite-input dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-xs bg-offwhite-input dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          {tab !== 'reset' && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {tab === 'login'
                ? 'Log in to sync your boards automatically across all your devices.'
                : 'Create an account to share boards with friends and save your tasks permanently.'}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !username.trim() || !password || ((tab === 'register' || tab === 'reset') && !birthday)}
            className={`w-full flex items-center justify-center gap-2 disabled:opacity-50 text-white font-medium py-2 rounded-xl shadow-lg transition active:scale-95 ${
              tab === 'reset'
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'
                : 'bg-brand-600 hover:bg-brand-500 shadow-brand-500/20'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : tab === 'reset' ? (
              <KeyRound className="w-4 h-4" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
            <span>
              {tab === 'login' ? 'Sign In' : tab === 'register' ? 'Create Account' : 'Reset Password & Sign In'}
            </span>
          </button>

          {tab === 'reset' && (
            <button
              type="button"
              onClick={() => { setTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
              className="w-full text-center text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition py-0.5"
            >
              ← Back to Sign In
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
