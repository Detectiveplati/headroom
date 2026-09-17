import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Wallet, 
  Layers,
  Database,
  KeyRound,
  Calendar
} from 'lucide-react';
import { User } from '../types';
import { loginApi, registerApi, resetPasswordApi } from '../utils/auth';

interface LoginPageProps {
  onSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register' | 'reset'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [birthday, setBirthday] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<{ online: boolean; persistent?: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setServerStatus({ online: true, persistent: data.persistent });
      })
      .catch(() => {
        setServerStatus({ online: false });
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (tab === 'login') {
        const { user } = await loginApi(username, password);
        onSuccess(user);
      } else if (tab === 'register') {
        if (!birthday) {
          throw new Error('Please select your birthday for account recovery.');
        }
        const { user } = await registerApi(username, password, birthday);
        onSuccess(user);
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
        setSuccessMsg('Password reset successfully! Entering Headroom...');
        setTimeout(() => {
          onSuccess(user);
        }, 800);
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-offwhite-bg dark:bg-[#090a0f] text-zinc-800 dark:text-zinc-100 flex flex-col items-center justify-center p-4 selection:bg-brand-500/30 selection:text-brand-700 dark:selection:text-brand-200 transition-colors duration-200">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 shadow-xl shadow-brand-500/25 ring-1 ring-white/20 mb-2">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Welcome to Headroom
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
            High-clarity cognitive Kanban, strict 2-task WIP guardrails, and financial headroom cockpit.
          </p>
        </div>

        {/* Auth Gate Card */}
        <div className="bg-offwhite-surface dark:bg-[#11131c] border border-zinc-200 dark:border-zinc-800/90 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md">
          {/* Tab Switcher */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-offwhite-subtle/50 dark:bg-zinc-950/40 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex-1 py-3.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
                tab === 'login'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-500/5 dark:bg-brand-500/10'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`flex-1 py-3.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
                tab === 'register'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-500/5 dark:bg-brand-500/10'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
            {tab === 'reset' && (
              <div
                className="flex-1 py-3.5 flex items-center justify-center gap-1.5 border-b-2 border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-500/10"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Reset</span>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{successMsg}</div>
              </div>
            )}

            {tab === 'reset' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
                <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="leading-relaxed">
                  Enter your username and registered birthday to verify your account and set a new password.
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. zack"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-offwhite-subtle dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-xs"
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            {(tab === 'register' || tab === 'reset') && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {tab === 'register' ? 'Birthday (for password recovery)' : 'Registered Birthday'}
                  </label>
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>YYYY-MM-DD</span>
                  </span>
                </div>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-offwhite-subtle dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-xs"
                  required
                />
                {tab === 'register' && (
                  <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                    Remember this birthday. It will be required if you ever need to reset your password.
                  </p>
                )}
              </div>
            )}

            {tab === 'login' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setTab('reset'); setErrorMsg(null); setSuccessMsg(null); }}
                    className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline hover:text-brand-500 transition"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-offwhite-subtle dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-xs"
                  required
                  autoComplete="current-password"
                />
              </div>
            )}

            {tab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-offwhite-subtle dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-xs"
                  required
                  autoComplete="new-password"
                />
              </div>
            )}

            {tab === 'reset' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password (min. 4 characters)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-offwhite-subtle dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-xs"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-offwhite-subtle dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-xs"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full mt-2 py-2.5 px-4 rounded-xl text-white font-semibold text-xs shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50 ${
                tab === 'reset'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/25'
                  : 'bg-brand-600 hover:bg-brand-500 shadow-brand-600/25'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{tab === 'reset' ? 'Resetting Password...' : 'Authenticating...'}</span>
                </>
              ) : tab === 'login' ? (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Enter Headroom</span>
                </>
              ) : tab === 'register' ? (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account & Enter</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Reset Password & Sign In</span>
                </>
              )}
            </button>

            {tab === 'reset' && (
              <button
                type="button"
                onClick={() => { setTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
                className="w-full text-center text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition py-1"
              >
                ← Back to Sign In
              </button>
            )}

            {/* Feature preview bullets */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/80 space-y-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Private, isolated workspace & board key</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                <span>Strict 2-task WIP guardrail & cockpit stopwatch</span>
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Private offline DBS/POSB bank CSV expense parser</span>
              </div>
            </div>
          </form>
        </div>

        {/* Database & Storage Status footer */}
        {serverStatus && (
          <div className="mt-4 text-center">
            {serverStatus.persistent === false ? (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-700 dark:text-amber-300 max-w-sm mx-auto flex items-center gap-2 text-left">
                <Database className="w-4 h-4 shrink-0 text-amber-500" />
                <span>
                  <strong>Notice:</strong> Database is in ephemeral file mode. Attach a Railway PostgreSQL database so users persist across git pushes.
                </span>
              </div>
            ) : serverStatus.persistent === true ? (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Connected to persistent PostgreSQL database
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
