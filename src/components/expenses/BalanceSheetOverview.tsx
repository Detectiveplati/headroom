import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Settings2, 
  X, 
  Landmark, 
  DollarSign 
} from 'lucide-react';
import { TrackedAccount, AccountType } from '../../types';

interface BalanceSheetOverviewProps {
  accounts: TrackedAccount[];
  onUpdateAccounts: (accounts: TrackedAccount[]) => void;
  selectedAccountId: string | 'all';
  onSelectAccount: (accountId: string | 'all') => void;
}

export const BalanceSheetOverview: React.FC<BalanceSheetOverviewProps> = ({
  accounts,
  onUpdateAccounts,
  selectedAccountId,
  onSelectAccount,
}) => {
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  // New account form
  const [newAccName, setNewAccName] = useState('');
  const [newAccInstitution, setNewAccInstitution] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>('debit');
  const [newAccBalance, setNewAccBalance] = useState('');
  const newAccColor = '#3b82f6';

  // Compute Balance Sheet Metrics
  const debitAccounts = accounts.filter((a) => a.type === 'debit' || a.type === 'cash');
  const creditAccounts = accounts.filter((a) => a.type === 'credit');

  const totalAssets = debitAccounts.reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
  const totalLiabilities = creditAccounts.reduce((sum, a) => sum + Math.abs(Number(a.currentBalance) || 0), 0);
  const netLiquidWorth = totalAssets - totalLiabilities;

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    const newAccount: TrackedAccount = {
      id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newAccName.trim(),
      institution: newAccInstitution.trim() || 'Bank',
      type: newAccType,
      color: newAccColor,
      currentBalance: parseFloat(newAccBalance) || 0,
      createdAt: Date.now(),
    };

    onUpdateAccounts([...accounts, newAccount]);
    setNewAccName('');
    setNewAccInstitution('');
    setNewAccBalance('');
  };

  const handleUpdateBalance = (id: string, newBalStr: string) => {
    const val = parseFloat(newBalStr);
    if (isNaN(val)) return;
    onUpdateAccounts(
      accounts.map((a) => (a.id === id ? { ...a, currentBalance: val } : a))
    );
  };

  const handleDeleteAccount = (id: string) => {
    if (accounts.length <= 1) {
      alert('You must have at least one tracked account.');
      return;
    }
    if (window.confirm('Delete this account from tracking?')) {
      onUpdateAccounts(accounts.filter((a) => a.id !== id));
      if (selectedAccountId === id) {
        onSelectAccount('all');
      }
    }
  };

  return (
    <div className="bg-offwhite-surface dark:bg-[#151722] border border-zinc-300/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/80 dark:border-zinc-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Balance Sheet & Liquid Position</span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {accounts.length} Accounts Tracked
              </span>
            </h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Real-time assets, liabilities, and multi-account balance reconciliation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsManageModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Manage Accounts</span>
          </button>
        </div>
      </div>

      {/* Summary Big Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Assets */}
        <div className="p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Liquid Assets (Debit/Cash)
            </span>
            <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
              ${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {debitAccounts.length} {debitAccounts.length === 1 ? 'account' : 'accounts'}
          </div>
        </div>

        {/* Total Liabilities */}
        <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              Liabilities (Credit Cards)
            </span>
            <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
              ${totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
            {creditAccounts.length} {creditAccounts.length === 1 ? 'card' : 'cards'}
          </div>
        </div>

        {/* Net Worth */}
        <div className="p-3.5 rounded-xl bg-brand-500/5 dark:bg-brand-950/20 border border-brand-500/20 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-brand-700 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Net Liquid Position
            </span>
            <div className={`text-lg font-bold font-mono mt-0.5 ${netLiquidWorth >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-rose-600 dark:text-rose-400'}`}>
              ${netLiquidWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-700 dark:text-brand-300">
            Assets − Liabilities
          </span>
        </div>
      </div>

      {/* Account Pills / Quick Selector */}
      <div className="pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => onSelectAccount('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
              selectedAccountId === 'all'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <span>All Accounts</span>
            <span className="text-[10px] font-mono opacity-80">({accounts.length})</span>
          </button>

          {accounts.map((acc) => {
            const isSelected = selectedAccountId === acc.id;
            const isDebit = acc.type === 'debit' || acc.type === 'cash';

            return (
              <button
                key={acc.id}
                onClick={() => onSelectAccount(acc.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-2 shrink-0 border ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50/70 dark:bg-brand-950/40 text-brand-900 dark:text-brand-100 font-semibold shadow-sm'
                    : 'border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
                }`}
              >
                <div 
                  className="w-2 h-2 rounded-full shrink-0" 
                  style={{ backgroundColor: acc.color || (isDebit ? '#10b981' : '#f43f5e') }} 
                />
                <span className="truncate max-w-[130px]">{acc.name}</span>
                <span className="text-[11px] font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  ${acc.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className={`text-[9px] uppercase px-1 py-0.2 rounded font-semibold ${
                  isDebit 
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                }`}>
                  {acc.type}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Manage Accounts Modal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-offwhite-surface dark:bg-[#12141e] border border-zinc-300/80 dark:border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                  Manage Tracked Accounts
                </h3>
              </div>
              <button
                onClick={() => setIsManageModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Account List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Configured Accounts ({accounts.length})
                </h4>
                <div className="divide-y divide-zinc-200/80 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white/50 dark:bg-zinc-900/50">
                  {accounts.map((acc) => (
                    <div key={acc.id} className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3.5 h-3.5 rounded-full shrink-0" 
                          style={{ backgroundColor: acc.color }} 
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                              {acc.name}
                            </span>
                            <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-bold ${
                              acc.type === 'debit' 
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            }`}>
                              {acc.type}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {acc.institution || 'Bank'} {acc.lastReconciledMonth ? `• Last reconciled: ${acc.lastReconciledMonth}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <label className="text-[10px] text-zinc-400 block">Balance</label>
                          <input
                            type="number"
                            step="any"
                            defaultValue={acc.currentBalance}
                            onBlur={(e) => handleUpdateBalance(acc.id, e.target.value)}
                            className="w-24 text-right px-2 py-1 text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        </div>

                        <button
                          onClick={() => handleDeleteAccount(acc.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                          title="Delete Account"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Account Form */}
              <form onSubmit={handleCreateAccount} className="p-4 bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-brand-500" />
                  <span>Add Another Account</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                      Account Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DBS Multiplier or Citi Card"
                      value={newAccName}
                      onChange={(e) => setNewAccName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                      Institution / Bank
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DBS, OCBC, UOB, Citi"
                      value={newAccInstitution}
                      onChange={(e) => setNewAccInstitution(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                      Account Type
                    </label>
                    <select
                      value={newAccType}
                      onChange={(e) => setNewAccType(e.target.value as AccountType)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                    >
                      <option value="debit">Debit / Savings / Cash (Asset)</option>
                      <option value="credit">Credit Card / Loan (Liability)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                      Initial Balance ($)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={newAccBalance}
                      onChange={(e) => setNewAccBalance(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Account</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <button
                onClick={() => setIsManageModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold shadow hover:opacity-90 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
