import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle2, FileText, UploadCloud, X } from 'lucide-react';
import { MonthlyAccountUpload, TrackedAccount } from '../../types';

interface StatementHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: TrackedAccount[];
  uploadLogs: MonthlyAccountUpload[];
  onTriggerUpload: (accountId: string, month: string) => void;
}

function monthRange(firstMonth: string, lastMonth: string): string[] {
  const months: string[] = [];
  const [firstYear, firstIndex] = firstMonth.split('-').map(Number);
  const [lastYear, lastIndex] = lastMonth.split('-').map(Number);
  const cursor = new Date(firstYear, firstIndex - 1, 1);
  const end = new Date(lastYear, lastIndex - 1, 1);
  while (cursor <= end) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

export const StatementHistoryModal: React.FC<StatementHistoryModalProps> = ({
  isOpen,
  onClose,
  accounts,
  uploadLogs,
  onTriggerUpload,
}) => {
  const trackedAccounts = useMemo(() => accounts.filter((account) =>
    uploadLogs.some((upload) => upload.accountId === account.id)
  ), [accounts, uploadLogs]);
  const currentMonth = new Date().toISOString().slice(0, 7);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl max-h-[84vh] overflow-hidden rounded-2xl border border-zinc-300/80 dark:border-zinc-800 bg-offwhite-surface dark:bg-[#12141e] shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Statement history</h2>
              <p className="text-[11px] text-zinc-500">Tracking begins with each account’s first uploaded statement.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[66vh] space-y-4">
          {trackedAccounts.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-500">
              Upload a bank statement to start tracking its reconciliation history.
            </div>
          ) : trackedAccounts.map((account) => {
            const accountLogs = uploadLogs
              .filter((upload) => upload.accountId === account.id)
              .sort((a, b) => a.month.localeCompare(b.month));
            const firstMonth = accountLogs[0]?.month;
            if (!firstMonth) return null;
            const months = monthRange(firstMonth, currentMonth).reverse();

            return (
              <section key={account.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/70 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: account.color }} />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{account.name}</span>
                  <span className="text-[10px] text-zinc-500">since {firstMonth}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px bg-zinc-200 dark:bg-zinc-800">
                  {months.map((month) => {
                    const upload = accountLogs.find((log) => log.month === month);
                    return upload ? (
                      <div key={month} className="p-3 bg-offwhite-surface dark:bg-[#12141e] text-xs">
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {month}
                        </div>
                        <div className="mt-1 text-[10px] text-zinc-500">{upload.transactionCount} transactions</div>
                      </div>
                    ) : (
                      <button
                        key={month}
                        onClick={() => onTriggerUpload(account.id, month)}
                        className="p-3 text-left bg-offwhite-surface dark:bg-[#12141e] hover:bg-amber-500/5 transition"
                      >
                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" /> {month}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500"><UploadCloud className="w-3 h-3" /> Upload missing</div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
