import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  UploadCloud, 
  Calendar, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';
import { TrackedAccount, MonthlyAccountUpload } from '../../types';

interface MonthlyUploadTrackerProps {
  accounts: TrackedAccount[];
  uploadLogs: MonthlyAccountUpload[];
  selectedMonth: string; // 'YYYY-MM' or 'all'
  onSelectMonth: (month: string) => void;
  availableMonths: string[];
  onTriggerUpload: (accountId?: string) => void;
}

export const MonthlyUploadTracker: React.FC<MonthlyUploadTrackerProps> = ({
  accounts,
  uploadLogs,
  selectedMonth,
  onSelectMonth,
  availableMonths,
  onTriggerUpload,
}) => {
  const [showMatrix, setShowMatrix] = useState(false);

  // Active target month for reconciliation checklist
  const currentMonthKey = useMemo(() => {
    if (selectedMonth && selectedMonth !== 'all') return selectedMonth;
    if (availableMonths.length > 0) return availableMonths[0];
    return new Date().toISOString().slice(0, 7); // Default to current YYYY-MM
  }, [selectedMonth, availableMonths]);

  // Find logs for this month
  const currentMonthLogs = useMemo(() => {
    return uploadLogs.filter((log) => log.month === currentMonthKey);
  }, [uploadLogs, currentMonthKey]);

  // Map account to upload log for current month
  const accountStatusMap = useMemo(() => {
    const map = new Map<string, MonthlyAccountUpload>();
    for (const log of currentMonthLogs) {
      map.set(log.accountId, log);
    }
    return map;
  }, [currentMonthLogs]);

  // Count uploaded vs missing for current month
  const uploadedCount = accounts.filter((acc) => accountStatusMap.has(acc.id)).length;
  const missingCount = accounts.length - uploadedCount;
  const isFullyReconciled = missingCount === 0 && accounts.length > 0;

  // Generate last 6 months list for matrix
  const matrixMonths = useMemo(() => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }
    // Merge any extra months from availableMonths
    for (const m of availableMonths) {
      if (!months.includes(m)) months.push(m);
    }
    return months.slice(0, 6);
  }, [availableMonths]);

  // Format YYYY-MM to human readable (e.g. "March 2026")
  const formatMonthLabel = (mKey: string) => {
    try {
      const [year, month] = mKey.split('-');
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return mKey;
    }
  };

  return (
    <div className="bg-offwhite-surface dark:bg-[#151722] border border-zinc-300/80 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header with Monthly Selector & Upload Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/80 dark:border-zinc-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
            isFullyReconciled 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          }`}>
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Monthly Statement Upload Status
              </h2>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isFullyReconciled 
                  ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' 
                  : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
              }`}>
                {uploadedCount} of {accounts.length} Uploaded
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Track whether all 3 accounts have their monthly statements imported.
            </p>
          </div>
        </div>

        {/* Month Picker for Checklist & History Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-[11px] text-zinc-500">Month:</span>
            <select
              value={currentMonthKey}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
            >
              {matrixMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowMatrix(!showMatrix)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <span>History Matrix</span>
            {showMatrix ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Account Checklist Cards for Active Month */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {accounts.map((acc) => {
          const uploadLog = accountStatusMap.get(acc.id);
          const isUploaded = !!uploadLog;
          return (
            <div
              key={acc.id}
              className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                isUploaded
                  ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30'
              }`}
            >
              <div>
                {/* Account Name & Status Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: acc.color }} 
                    />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {acc.name}
                      </h4>
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold">
                        {acc.institution} • {acc.type}
                      </span>
                    </div>
                  </div>

                  {isUploaded ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Uploaded
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 shrink-0">
                      <AlertCircle className="w-3 h-3" />
                      Missing
                    </span>
                  )}
                </div>

                {/* Uploaded Details or Missing Warning */}
                {isUploaded && uploadLog ? (
                  <div className="mt-3 pt-2.5 border-t border-emerald-500/15 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Closing Balance:</span>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        ${(uploadLog.closingBalance ?? acc.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
                      <span>Transactions:</span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {uploadLog.transactionCount} rows
                      </span>
                    </div>
                    {uploadLog.statementPeriod && (
                      <div className="text-[10px] text-zinc-500 truncate pt-0.5">
                        Period: {uploadLog.statementPeriod}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 pt-2.5 border-t border-amber-500/15 space-y-1">
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      No statement uploaded for {formatMonthLabel(currentMonthKey)}.
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Balances and transactions are not reconciled for this period.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-2">
                {isUploaded ? (
                  <button
                    onClick={() => onTriggerUpload(acc.id)}
                    className="w-full py-1.5 px-2.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition flex items-center justify-center gap-1.5"
                  >
                    <UploadCloud className="w-3 h-3" />
                    <span>Re-upload / Update Statement</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onTriggerUpload(acc.id)}
                    className="w-full py-1.5 px-2.5 text-[11px] font-semibold text-white bg-amber-600 hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500 rounded-lg shadow-sm transition flex items-center justify-center gap-1.5"
                  >
                    <UploadCloud className="w-3 h-3" />
                    <span>Upload {formatMonthLabel(currentMonthKey).split(' ')[0]} Statement</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Multi-Month Matrix Accordion */}
      {showMatrix && (
        <div className="pt-3 border-t border-zinc-200/80 dark:border-zinc-800 animate-fade-in space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              6-Month Statement Upload Matrix
            </h4>
            <span className="text-[10px] text-zinc-400">
              Click any month to inspect or upload missing statements
            </span>
          </div>

          <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/40 dark:bg-zinc-900/40">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/50 text-[11px] text-zinc-500">
                  <th className="py-2.5 px-4 font-semibold">Account</th>
                  {matrixMonths.map((m) => (
                    <th key={m} className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">
                      {formatMonthLabel(m).split(' ')[0]} '{m.slice(2, 4)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
                    <td className="py-2 px-4 font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }} />
                      <span>{acc.name}</span>
                    </td>
                    {matrixMonths.map((m) => {
                      const log = uploadLogs.find((l) => l.accountId === acc.id && l.month === m);
                      const isUp = !!log;

                      return (
                        <td key={m} className="py-2 px-3 text-center">
                          {isUp ? (
                            <button
                              onClick={() => onSelectMonth(m)}
                              title={`Uploaded on ${new Date(log.uploadedAt).toLocaleDateString()} - ${log.transactionCount} transactions`}
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 transition"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>OK</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                onSelectMonth(m);
                                onTriggerUpload(acc.id);
                              }}
                              title={`Click to upload statement for ${acc.name} (${m})`}
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition"
                            >
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>Missing</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
