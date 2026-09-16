import React, { useEffect, useMemo, useState } from 'react';
import { 
  CreditCard, 
  UploadCloud, 
  Plus, 
  Search, 
  Calendar, 
  ChevronLeft,
  ChevronRight,
  Trash2, 
  Check, 
  Sparkles, 
  TrendingUp, 
  Layers,
  Sliders, 
  Download, 
  ShoppingBag,
  Utensils,
  Car,
  Tv,
  Smile,
  FileText,
  DollarSign,
  ArrowRightLeft,
  Wallet
} from 'lucide-react';
import { 
  Transaction, 
  TransactionType, 
  ExpenseCategory, 
  CategoryBudget, 
  CardMetaInfo,
  TrackedAccount,
  MonthlyAccountUpload
} from '../../types';
import { CsvImportModal, StatementUploadContext } from './CsvImportModal';
import { BalanceSheetOverview } from './BalanceSheetOverview';
import { StatementHistoryModal } from './StatementHistoryModal';
import { getTransactionTypeForCategory, isAmbiguousGrabDescription, isIncomingMoneyDescription, isSubscriptionDescription } from '../../utils/csvParser';
import { OfficeClaimReimbursementMethod } from '../../types';
import { getManualCategoryRulePattern } from '../../utils/manualCategoryRule';

interface ExpenseDashboardProps {
  transactions: Transaction[];
  onUpdateTransactions: (updater: Transaction[] | ((prev: Transaction[]) => Transaction[])) => void;
  budgets: CategoryBudget[];
  onUpdateBudgets: (newBudgets: CategoryBudget[]) => void;
  categoryRules: Record<string, ExpenseCategory>;
  onSaveRule: (pattern: string, category: ExpenseCategory) => void;
  onSaveRulesBatch?: (newRules: Record<string, ExpenseCategory>) => void;
  cardMeta: CardMetaInfo;
  onUpdateCardMeta: (meta: CardMetaInfo) => void;
  accounts: TrackedAccount[];
  onUpdateAccounts: (accounts: TrackedAccount[]) => void;
  uploadLogs: MonthlyAccountUpload[];
  onUpdateUploadLogs: (updater: MonthlyAccountUpload[] | ((prev: MonthlyAccountUpload[]) => MonthlyAccountUpload[])) => void;
}

const ALL_CATEGORIES: ExpenseCategory[] = [
  'Salary & Income',
  'Money In',
  'Office Claims',
  'Food & Dining',
  'Groceries',
  'Transport & Petrol',
  'Shopping & E-Commerce',
  'Subscriptions',
  'Entertainment & Gaming',
  'Personal Care & Services',
  'Bills & Utilities',
  'Transfer / Payment',
  'PayNow Transfers',
  'Uncategorized',
];

export const ExpenseDashboard: React.FC<ExpenseDashboardProps> = ({
  transactions,
  onUpdateTransactions,
  budgets,
  onUpdateBudgets,
  categoryRules,
  onSaveRule,
  onSaveRulesBatch,
  cardMeta,
  onUpdateCardMeta,
  accounts,
  onUpdateAccounts,
  uploadLogs,
  onUpdateUploadLogs,
}) => {
  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all');
  const [selectedType, setSelectedType] = useState<TransactionType | 'all'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | 'all'>('all');

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isStatementHistoryOpen, setIsStatementHistoryOpen] = useState(false);
  const [importTargetAccountId, setImportTargetAccountId] = useState<string | undefined>(undefined);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  // Migrate older imports that treated incoming person-to-person deposits as refunds.
  // This runs once per matching transaction because the update changes its type.
  useEffect(() => {
    const needsMoneyInMigration = transactions.some(
      (transaction) => transaction.type === 'refund' && isIncomingMoneyDescription(transaction.rawDescription)
    );
    if (!needsMoneyInMigration) return;

    onUpdateTransactions((previous) => previous.map((transaction) => (
      transaction.type === 'refund' && isIncomingMoneyDescription(transaction.rawDescription)
        ? { ...transaction, category: 'Money In', type: 'income', reviewed: false }
        : transaction
    )));
  }, [transactions, onUpdateTransactions]);

  // Move known recurring merchants out of the former Entertainment bucket.
  useEffect(() => {
    const needsSubscriptionMigration = transactions.some((transaction) => (
      transaction.category === 'Entertainment & Gaming' && isSubscriptionDescription(transaction.rawDescription)
    ));
    if (!needsSubscriptionMigration) return;

    onUpdateTransactions((previous) => previous.map((transaction) => (
      transaction.category === 'Entertainment & Gaming' && isSubscriptionDescription(transaction.rawDescription)
        ? { ...transaction, category: 'Subscriptions', reviewed: false }
        : transaction
    )));
  }, [transactions, onUpdateTransactions]);

  // Older imports defaulted generic Grab descriptions to transport. Keep explicit
  // GrabCar/GrabRide entries untouched, but align ambiguous charges to GrabFood.
  useEffect(() => {
    const needsGrabMigration = transactions.some((transaction) => (
      transaction.category === 'Transport & Petrol' && isAmbiguousGrabDescription(transaction.rawDescription)
    ));
    if (!needsGrabMigration) return;

    onUpdateTransactions((previous) => previous.map((transaction) => (
      transaction.category === 'Transport & Petrol' && isAmbiguousGrabDescription(transaction.rawDescription)
        ? { ...transaction, category: 'Food & Dining', reviewed: false }
        : transaction
    )));
  }, [transactions, onUpdateTransactions]);

  // New Transaction Form State
  const [newTxDate, setNewTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [newTxMerchant, setNewTxMerchant] = useState('');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxCategory, setNewTxCategory] = useState<ExpenseCategory>('Food & Dining');
  const [newTxType, setNewTxType] = useState<TransactionType>('expense');

  // Discover distinct months in the dataset
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.date && tx.date.length >= 7) {
        months.add(tx.date.substring(0, 7)); // YYYY-MM
      }
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // Choose the newest imported month once data arrives; afterwards the period is always explicit.
  useEffect(() => {
    if (!selectedMonth && availableMonths[0]) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  const summaryMonth = selectedMonth || new Date().toISOString().slice(0, 7);
  const reportingPeriod = useMemo(() => {
    const [year, month] = summaryMonth.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const isCurrent = summaryMonth === currentMonth;
    const formatter = new Intl.DateTimeFormat('en-SG', { month: 'long', year: 'numeric' });
    const shortFormatter = new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short' });
    const daysElapsed = isCurrent ? Math.min(new Date().getDate(), daysInMonth) : daysInMonth;

    return {
      label: formatter.format(monthStart),
      range: isCurrent
        ? `1–${daysElapsed} ${shortFormatter.format(monthStart)} · ${daysElapsed} of ${daysInMonth} days elapsed`
        : `1–${daysInMonth} ${shortFormatter.format(monthStart)} · Complete month`,
      isCurrent,
    };
  }, [summaryMonth]);

  const reportingMonthOptions = useMemo(
    () => Array.from(new Set([summaryMonth, ...availableMonths])).sort().reverse(),
    [summaryMonth, availableMonths]
  );

  const shiftReportingMonth = (offset: number) => {
    const [year, month] = summaryMonth.split('-').map(Number);
    const nextMonth = new Date(year, month - 1 + offset, 1);
    setSelectedMonth(`${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatReportingMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    return new Intl.DateTimeFormat('en-SG', { month: 'long', year: 'numeric' })
      .format(new Date(year, month - 1, 1));
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedAccountId !== 'all' && tx.accountId !== selectedAccountId) return false;
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) return false;
      if (selectedType !== 'all' && tx.type !== selectedType) return false;
      if (!tx.date || !tx.date.startsWith(summaryMonth)) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesMerchant = tx.cleanMerchant.toLowerCase().includes(query);
        const matchesRaw = tx.rawDescription.toLowerCase().includes(query);
        const matchesCat = tx.category.toLowerCase().includes(query);
        const matchesAcc = (tx.accountName || '').toLowerCase().includes(query);
        if (!matchesMerchant && !matchesRaw && !matchesCat && !matchesAcc) return false;
      }

      return true;
    }).sort((a, b) => {
      const categoryPriority = Number(b.category === 'Uncategorized') - Number(a.category === 'Uncategorized');
      return categoryPriority || b.createdAt - a.createdAt;
    });
  }, [transactions, selectedAccountId, selectedCategory, selectedType, summaryMonth, searchQuery]);

  // Aggregate stats for the visible account and dashboard month.
  const stats = useMemo(() => {
    const scope = transactions.filter((transaction) => {
      const belongsToMonth = transaction.date?.startsWith(summaryMonth);
      const belongsToAccount = selectedAccountId === 'all' || transaction.accountId === selectedAccountId;
      return belongsToMonth && belongsToAccount;
    });

    const totalSpend = scope
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalIncome = scope
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalRefunds = scope
      .filter((t) => t.type === 'refund')
      .reduce((sum, t) => sum + t.amount, 0);

    const netSpend = Math.max(0, totalSpend - totalRefunds);
    const netCashflow = totalIncome - netSpend;

    const totalTransfers = scope
      .filter((t) => t.type === 'transfer')
      .reduce((sum, t) => sum + t.amount, 0);

    // Spend by category
    const categorySpend: Record<ExpenseCategory, number> = {
      'Salary & Income': 0,
      'Money In': 0,
      'Office Claims': 0,
      'Food & Dining': 0,
      'Groceries': 0,
      'Transport & Petrol': 0,
      'Shopping & E-Commerce': 0,
      'Subscriptions': 0,
      'Entertainment & Gaming': 0,
      'Personal Care & Services': 0,
      'Bills & Utilities': 0,
      'Transfer / Payment': 0,
      'PayNow Transfers': 0,
      'Uncategorized': 0,
    };

    scope.forEach((t) => {
      if (t.type === 'expense') {
        categorySpend[t.category] = (categorySpend[t.category] || 0) + t.amount;
      } else if (t.type === 'refund') {
        categorySpend[t.category] = Math.max(0, (categorySpend[t.category] || 0) - t.amount);
      }
    });

    const topSpendingCategory = (Object.entries(categorySpend) as [ExpenseCategory, number][])
      .filter(([category]) => category !== 'Salary & Income' && category !== 'Money In' && category !== 'Transfer / Payment' && category !== 'PayNow Transfers')
      .reduce<{ category: ExpenseCategory; amount: number } | null>(
        (top, [category, amount]) => amount > (top?.amount ?? 0) ? { category, amount } : top,
        null
      );

    // Unreviewed items
    const unreviewedCount = scope.filter((t) => !t.reviewed).length;
    const uncategorizedCount = scope.filter((t) => t.category === 'Uncategorized').length;

    // Daily pace / burn rate calculation
    const [year, month] = summaryMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const daysElapsed = summaryMonth < currentMonthKey
      ? daysInMonth
      : summaryMonth === currentMonthKey
        ? Math.min(new Date().getDate(), daysInMonth)
        : 0;
    const dailyPace = netSpend > 0 && daysElapsed > 0 ? netSpend / daysElapsed : 0;
    const projectedSpend = dailyPace * daysInMonth;
    const totalBudget = budgets.reduce((sum, budget) => sum + budget.monthlyLimit, 0);
    const expectedSpend = daysElapsed > 0 ? (totalBudget * daysElapsed) / daysInMonth : 0;

    return {
      totalSpend,
      totalIncome,
      netCashflow,
      totalRefunds,
      netSpend,
      totalTransfers,
      categorySpend,
      topSpendingCategory,
      unreviewedCount,
      uncategorizedCount,
      dailyPace,
      projectedSpend,
      totalBudget,
      budgetRemaining: totalBudget - netSpend,
      expectedSpend,
      isOverPace: netSpend > expectedSpend,
    };
  }, [transactions, budgets, selectedAccountId, summaryMonth]);

  // Category Icon Mapper
  const getCategoryIcon = (category: ExpenseCategory) => {
    switch (category) {
      case 'Salary & Income':
        return <Wallet className="w-3.5 h-3.5 text-emerald-500" />;
      case 'Money In':
        return <Wallet className="w-3.5 h-3.5 text-cyan-500" />;
      case 'Office Claims':
        return <FileText className="w-3.5 h-3.5 text-sky-500" />;
      case 'Food & Dining':
        return <Utensils className="w-3.5 h-3.5 text-amber-500" />;
      case 'Groceries':
        return <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />;
      case 'Transport & Petrol':
        return <Car className="w-3.5 h-3.5 text-blue-500" />;
      case 'Shopping & E-Commerce':
        return <Smile className="w-3.5 h-3.5 text-purple-500" />;
      case 'Subscriptions':
        return <CreditCard className="w-3.5 h-3.5 text-violet-500" />;
      case 'Entertainment & Gaming':
        return <Tv className="w-3.5 h-3.5 text-pink-500" />;
      case 'Personal Care & Services':
        return <Sparkles className="w-3.5 h-3.5 text-teal-500" />;
      case 'Bills & Utilities':
        return <FileText className="w-3.5 h-3.5 text-orange-500" />;
      case 'Transfer / Payment':
        return <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />;
      case 'PayNow Transfers':
        return <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-500" />;
      default:
        return <DollarSign className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  // Handlers
  const handleImportBatch = (
    newTxs: Transaction[],
    meta: CardMetaInfo,
    uploadContext?: StatementUploadContext
  ) => {
    const detectedAccountName = meta.accountName?.trim();
    const selectedAccount = uploadContext?.accountId
      ? accounts.find((account) => account.id === uploadContext.accountId)
      : undefined;
    const matchingAccount = detectedAccountName
      ? accounts.find((account) => account.name.toLowerCase() === detectedAccountName.toLowerCase())
      : undefined;
    const reconciledAccount = selectedAccount || matchingAccount;
    const createdAccount: TrackedAccount | undefined = !reconciledAccount && detectedAccountName
      ? {
          id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: detectedAccountName,
          institution: detectedAccountName.split(/\s+/)[0] || 'Bank',
          type: meta.accountType || 'debit',
          color: meta.accountType === 'credit' ? '#8b5cf6' : '#3b82f6',
          currentBalance: uploadContext?.closingBalance || 0,
          lastReconciledMonth: uploadContext?.month,
          createdAt: Date.now(),
        }
      : undefined;
    const accountId = reconciledAccount?.id || createdAccount?.id;
    const accountName = reconciledAccount?.name || createdAccount?.name;
    const enrichedTransactions = accountId
      ? newTxs.map((transaction) => ({ ...transaction, accountId, accountName }))
      : newTxs;

    onUpdateTransactions((prev) => [...enrichedTransactions, ...prev]);

    if (meta.accountName || meta.creditLimit || meta.closingBalance !== undefined) {
      onUpdateCardMeta({ ...cardMeta, ...meta });
    }

    if (createdAccount) {
      onUpdateAccounts([...accounts, createdAccount]);
    } else if (accountId && uploadContext?.closingBalance !== undefined) {
      onUpdateAccounts(
        accounts.map((a) =>
          a.id === accountId
            ? {
                ...a,
                currentBalance: uploadContext.closingBalance ?? a.currentBalance,
                lastReconciledMonth: uploadContext.month || a.lastReconciledMonth,
              }
            : a
        )
      );
    }

    if (accountId && uploadContext) {

      const newLog: MonthlyAccountUpload = {
        id: `up_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        accountId,
        month: uploadContext.month || (enrichedTransactions[0]?.date ? enrichedTransactions[0].date.slice(0, 7) : new Date().toISOString().slice(0, 7)),
        uploadedAt: Date.now(),
        fileName: uploadContext.fileName || 'Bank Statement',
        statementPeriod: meta.statementPeriod || meta.statementDate,
        startingBalance: uploadContext.startingBalance,
        closingBalance: uploadContext.closingBalance,
        transactionCount: newTxs.length,
      };

      onUpdateUploadLogs((prev) => [
        newLog,
        ...prev.filter((l) => !(l.accountId === newLog.accountId && l.month === newLog.month)),
      ]);
    }
  };

  const handleTriggerUploadForAccount = (accId?: string, month?: string) => {
    setImportTargetAccountId(accId);
    if (month) setSelectedMonth(month);
    setIsImportModalOpen(true);
  };

  const handleInlineCategoryChange = (txId: string, merchant: string, newCat: ExpenseCategory) => {
    onUpdateTransactions((prev) =>
      prev.map((t) => t.id === txId
        ? {
            ...t,
            category: newCat,
            type: getTransactionTypeForCategory(newCat, t.type),
            reimbursementMethod: newCat === 'Office Claims'
              ? (t.type === 'refund' ? 'account' : t.reimbursementMethod || 'pending')
              : undefined,
            reviewed: true,
          }
        : t)
    );

    const rulePattern = getManualCategoryRulePattern(newCat, merchant);
    if (rulePattern) {
      onSaveRule(rulePattern, newCat);
    }
  };

  const handleOfficeClaimReimbursement = (txId: string, method: OfficeClaimReimbursementMethod) => {
    onUpdateTransactions((prev) => prev.map((transaction) => (
      transaction.id === txId
        ? { ...transaction, reimbursementMethod: method, reviewed: true }
        : transaction
    )));
  };

  const handleDeleteTx = (id: string) => {
    if (window.confirm('Delete this transaction?')) {
      onUpdateTransactions((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleToggleReviewed = (id: string) => {
    onUpdateTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, reviewed: !t.reviewed } : t))
    );
  };

  const handleMarkAllReviewed = () => {
    onUpdateTransactions((prev) => prev.map((t) => ({ ...t, reviewed: true })));
  };

  const handleClearAllTransactions = () => {
    if (window.confirm('Are you sure you want to clear all transactions? This cannot be undone.')) {
      onUpdateTransactions([]);
      onUpdateCardMeta({});
    }
  };

  const handleAddManualTx = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newTxAmount);
    if (!newTxMerchant.trim() || isNaN(amountNum) || amountNum <= 0) return;

    const chosenAcc = selectedAccountId !== 'all'
      ? accounts.find((a) => a.id === selectedAccountId)
      : (accounts.length > 0 ? accounts[0] : undefined);

    const newTx: Transaction = {
      id: `tx_${Date.now()}_manual`,
      accountId: chosenAcc?.id,
      accountName: chosenAcc?.name,
      date: newTxDate,
      rawDescription: newTxMerchant.trim(),
      cleanMerchant: newTxMerchant.trim(),
      amount: amountNum,
      type: newTxType,
      category: newTxCategory,
      reimbursementMethod: newTxCategory === 'Office Claims'
        ? (newTxType === 'refund' ? 'account' : 'pending')
        : undefined,
      reviewed: true,
      createdAt: Date.now(),
    };

    onUpdateTransactions((prev) => [newTx, ...prev]);
    setIsAddTxModalOpen(false);
    setNewTxMerchant('');
    setNewTxAmount('');
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Merchant', 'Raw Description', 'Amount', 'Type', 'Category', 'Payment Type'];
    const rows = transactions.map((t) => [
      `"${t.date}"`,
      `"${t.cleanMerchant.replace(/"/g, '""')}"`,
      `"${t.rawDescription.replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
      `"${t.type}"`,
      `"${t.category}"`,
      `"${t.paymentType || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `headroom-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Cockpit Financial Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              Financial Headroom
            </h1>
            {cardMeta.accountName && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {cardMeta.accountName.replace(/MasterCard Platinum/i, 'MasterCard')}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Cognitive expense tracking, pace forecasting, and automatic bank statement normalization.
          </p>

          <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-2xl border border-brand-500/30 bg-brand-500/5 px-2 py-1.5 text-left shadow-sm">
            <Calendar className="ml-1 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
            <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-zinc-500 sm:inline">Reporting period</span>
            <button
              onClick={() => shiftReportingMonth(-1)}
              className="rounded-lg p-1 text-zinc-500 transition hover:bg-brand-500/10 hover:text-brand-700 dark:hover:text-brand-300"
              title="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <select
                aria-label="Reporting month"
                value={summaryMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="max-w-[170px] cursor-pointer appearance-none bg-transparent pr-1 text-sm font-bold text-zinc-900 outline-none dark:text-zinc-100"
              >
                {reportingMonthOptions.map((month) => (
                  <option key={month} value={month}>{formatReportingMonth(month)}</option>
                ))}
              </select>
              <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">{reportingPeriod.range}</p>
            </div>
            <button
              onClick={() => shiftReportingMonth(1)}
              className="rounded-lg p-1 text-zinc-500 transition hover:bg-brand-500/10 hover:text-brand-700 dark:hover:text-brand-300"
              title="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {reportingPeriod.isCurrent && (
              <span className="mr-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Current</span>
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Import Statement */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition active:scale-95"
            title="Import Bank Statement (PDF or CSV)"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Import Statement</span>
            <span className="hidden sm:inline-block text-[10px] px-1 py-0.5 bg-white/20 rounded font-normal">
              PDF/CSV
            </span>
          </button>

          <button
            onClick={() => setIsStatementHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition"
            title="View statement history for uploaded accounts"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Statements</span>
          </button>

          {/* Manual Add */}
          <button
            onClick={() => setIsAddTxModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Entry</span>
          </button>

          {/* Budget Limits Modal */}
          <button
            onClick={() => setIsBudgetModalOpen(true)}
            className="p-1.5 rounded-xl border border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
            title="Adjust Monthly Budget Targets"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="p-1.5 rounded-xl border border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
            title="Export Cleaned Expenses as CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Clear All Transactions */}
          {transactions.length > 0 && (
            <button
              onClick={handleClearAllTransactions}
              className="p-1.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
              title="Clear all transactions"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Balance Sheet Overview (Liquid Assets vs Liabilities) */}
      <BalanceSheetOverview
        accounts={accounts}
        onUpdateAccounts={onUpdateAccounts}
        selectedAccountId={selectedAccountId}
        onSelectAccount={setSelectedAccountId}
      />

      {/* Monthly expense summary. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* Total expenditure */}
        <div className="p-4 rounded-2xl bg-offwhite-surface dark:bg-zinc-900/80 border border-zinc-300/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Total Expenditure</span>
            <TrendingUp className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              SGD ${stats.netSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              ${stats.totalRefunds.toFixed(0)} in refunds already deducted
            </div>
          </div>
        </div>

        {/* Total income */}
        <div className="p-4 rounded-2xl bg-offwhite-surface dark:bg-zinc-900/80 border border-zinc-300/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Total Income</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              SGD ${stats.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              Net cash flow: {stats.netCashflow >= 0 ? '+' : '-'}${Math.abs(stats.netCashflow).toFixed(0)}
            </div>
          </div>
        </div>

        {/* Budget remaining */}
        <div className="p-4 rounded-2xl bg-offwhite-surface dark:bg-zinc-900/80 border border-zinc-300/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Budget Remaining</span>
            <CreditCard className={`w-4 h-4 ${stats.budgetRemaining < 0 ? 'text-red-500' : 'text-brand-500'}`} />
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-bold font-mono ${stats.budgetRemaining < 0 ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
              SGD ${Math.abs(stats.budgetRemaining).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              {stats.budgetRemaining < 0 ? 'Over' : 'Left from'} ${stats.totalBudget.toFixed(0)} monthly budget
            </div>
          </div>
        </div>

        {/* Highest-spend category */}
        <button onClick={() => stats.topSpendingCategory && setSelectedCategory(stats.topSpendingCategory.category)} className="p-4 rounded-2xl bg-offwhite-surface dark:bg-zinc-900/80 border border-zinc-300/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between text-left hover:border-brand-500/50 transition">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Top Spending Category</span>
            {stats.topSpendingCategory ? getCategoryIcon(stats.topSpendingCategory.category) : <FileText className="w-4 h-4 text-zinc-400" />}
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {stats.topSpendingCategory ? `$${stats.topSpendingCategory.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              {stats.topSpendingCategory ? `${stats.topSpendingCategory.category} — click to filter` : 'No spending recorded this month'}
            </div>
          </div>
        </button>
      </div>

      {/* Category Budget Breakdown Bar Section */}
      <div className="p-5 rounded-2xl bg-offwhite-surface dark:bg-zinc-900/80 border border-zinc-300/80 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            {reportingPeriod.label} Category Budgets
          </h2>
          <button
            onClick={() => setIsBudgetModalOpen(true)}
            className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
          >
            Adjust Targets
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {budgets.map((budget) => {
            const spent = stats.categorySpend[budget.category] || 0;
            const percentage = budget.monthlyLimit > 0 ? Math.round((spent / budget.monthlyLimit) * 100) : 0;
            const isOverBudget = spent > budget.monthlyLimit;

            return (
              <div
                key={budget.category}
                onClick={() => setSelectedCategory(budget.category === selectedCategory ? 'all' : budget.category)}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  selectedCategory === budget.category
                    ? 'border-brand-500 bg-brand-500/5 dark:bg-brand-500/10'
                    : 'border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 bg-offwhite-subtle/50 dark:bg-zinc-900/50'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5 font-medium text-zinc-800 dark:text-zinc-200">
                    {getCategoryIcon(budget.category)}
                    <span>{budget.category}</span>
                  </div>
                  <span className={`font-mono font-semibold text-[11px] ${
                    isOverBudget
                      ? 'text-red-600 dark:text-red-400'
                      : percentage >= 80
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    ${spent.toFixed(0)} <span className="font-normal text-zinc-400">/ ${budget.monthlyLimit}</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOverBudget
                        ? 'bg-red-500'
                        : percentage >= 80
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-brand-600 to-indigo-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Ledger Header Toolbar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Transactions <span className="font-normal text-zinc-500 dark:text-zinc-400">· {reportingPeriod.label}</span>
          </h2>
          <span className="text-[11px] text-zinc-500">{filteredTransactions.length} shown</span>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search merchant, notes, or category..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-300/80 dark:border-zinc-800 bg-offwhite-surface dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 bg-offwhite-subtle dark:bg-zinc-900 p-1 rounded-xl border border-zinc-300/80 dark:border-zinc-800 text-xs self-start md:self-auto">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-2.5 py-1 rounded-lg transition font-medium ${
                selectedType === 'all'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setSelectedType('expense')}
              className={`px-2.5 py-1 rounded-lg transition font-medium ${
                selectedType === 'expense'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Debits
            </button>
            <button
              onClick={() => setSelectedType('refund')}
              className={`px-2.5 py-1 rounded-lg transition font-medium ${
                selectedType === 'refund'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Refunds
            </button>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedType('income');
              }}
              className={`px-2.5 py-1 rounded-lg transition font-medium ${
                selectedType === 'income' && selectedCategory === 'all'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              All Income
            </button>
            <button
              onClick={() => {
                setSelectedCategory('Money In');
                setSelectedType('income');
              }}
              className={`px-2.5 py-1 rounded-lg transition font-medium ${
                selectedType === 'income' && selectedCategory === 'Money In'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
              title="Incoming transfers and deposits that are not shop refunds"
            >
              Other Money In
            </button>
            <button
              onClick={() => setSelectedType('transfer')}
              className={`px-2.5 py-1 rounded-lg transition font-medium ${
                selectedType === 'transfer'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Payments
            </button>
          </div>

          {/* Review Queue Count */}
          {stats.unreviewedCount > 0 && (
            <button
              onClick={handleMarkAllReviewed}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
            >
              Mark {stats.unreviewedCount} items reviewed
            </button>
          )}
        </div>

        {/* Category Horizontal Filter Tags */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition border ${
              selectedCategory === 'all'
                ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 border-transparent'
                : 'bg-offwhite-surface dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300/70 dark:border-zinc-800 hover:border-zinc-400'
            }`}
          >
            All Categories
          </button>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg whitespace-nowrap transition border ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white border-transparent'
                  : 'bg-offwhite-surface dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300/70 dark:border-zinc-800 hover:border-zinc-400'
              }`}
            >
              {getCategoryIcon(cat)}
              <span>{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="border border-zinc-300/80 dark:border-zinc-800 rounded-2xl overflow-hidden bg-offwhite-surface dark:bg-zinc-900/60 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-offwhite-subtle dark:bg-zinc-900 text-zinc-500 border-b border-zinc-300/70 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4 w-10">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Clean Merchant</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 w-44">Account</th>
                <th className="py-3 px-4 w-12 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    {transactions.length === 0
                      ? 'No transactions yet. Click "Import Statement" (PDF/CSV) or "Add Entry" to upload your data.'
                      : 'No transactions match your current filters.'}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-zinc-100/60 dark:hover:bg-zinc-800/30 transition group"
                  >
                    {/* Reviewed check */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleReviewed(tx.id)}
                        className={`w-5 h-5 rounded flex items-center justify-center transition ${
                          tx.reviewed
                            ? 'text-emerald-500 bg-emerald-500/10'
                            : 'text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 border border-zinc-300 dark:border-zinc-700'
                        }`}
                        title={tx.reviewed ? 'Reviewed' : 'Click to mark reviewed'}
                      >
                        {tx.reviewed && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {tx.date}
                    </td>

                    {/* Merchant & Raw hover */}
                    <td className="py-3 px-4 max-w-xs truncate">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {tx.cleanMerchant}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate" title={tx.rawDescription}>
                        {tx.rawDescription}
                      </div>
                    </td>

                    {/* Category Selector Dropdown */}
                    <td className="py-3 px-4">
                      <select
                        value={tx.category}
                        onChange={(e) =>
                          handleInlineCategoryChange(
                            tx.id,
                            tx.cleanMerchant,
                            e.target.value as ExpenseCategory
                          )
                        }
                        className="text-[11px] py-1 px-2 rounded-lg border border-zinc-300/80 dark:border-zinc-700 bg-offwhite-surface dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        {ALL_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      {tx.category === 'Office Claims' && (
                        tx.type === 'refund' ? (
                          <div className="mt-1 text-[10px] font-medium text-teal-600 dark:text-teal-400">
                            Refunded to account
                          </div>
                        ) : tx.type === 'expense' ? (
                          <select
                            value={tx.reimbursementMethod || 'pending'}
                            onChange={(event) => handleOfficeClaimReimbursement(
                              tx.id,
                              event.target.value as OfficeClaimReimbursementMethod
                            )}
                            className="mt-1 max-w-full text-[10px] py-0.5 px-1.5 rounded-md border border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            title="Cash reimbursement does not appear in this bank account, so the debit remains in expenditure."
                          >
                            <option value="pending">Awaiting reimbursement</option>
                            <option value="cash">Reimbursed in cash · keep debit</option>
                          </select>
                        ) : null
                      )}
                    </td>

                    {/* Payment Type */}
                    <td className="py-3 px-4 whitespace-nowrap text-zinc-500">
                      {tx.paymentType ? (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-[10px]">
                          {tx.paymentType}
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-[10px]">—</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                      <span
                        className={
                          tx.type === 'expense'
                            ? 'text-zinc-900 dark:text-zinc-100'
                            : tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : tx.type === 'refund'
                            ? 'text-teal-600 dark:text-teal-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }
                      >
                        {tx.type === 'income' || tx.type === 'refund' ? '+' : tx.type === 'expense' ? '-' : ''}$
                        {tx.amount.toFixed(2)}
                      </span>
                    </td>

                    {/* Account Tag: secondary context, intentionally kept after Amount. */}
                    <td className="py-3 px-4 max-w-44">
                      {(() => {
                        const acc = accounts.find((a) => a.id === tx.accountId) ||
                          accounts.find((a) => a.name.toLowerCase() === (tx.accountName || '').toLowerCase());
                        const color = acc?.color || '#a1a1aa';
                        const name = acc?.name || tx.accountName || 'Primary';

                        return (
                          <span
                            title={name}
                            className="inline-flex max-w-36 items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                          >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="truncate">{name}</span>
                          </span>
                        );
                      })()}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteTx(tx.id)}
                        className="p-1 rounded text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StatementHistoryModal
        isOpen={isStatementHistoryOpen}
        onClose={() => setIsStatementHistoryOpen(false)}
        accounts={accounts}
        uploadLogs={uploadLogs}
        onTriggerUpload={(accountId, month) => {
          setIsStatementHistoryOpen(false);
          handleTriggerUploadForAccount(accountId, month);
        }}
      />

      {/* CSV / Statement Import Modal */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportTargetAccountId(undefined);
        }}
        onImport={handleImportBatch}
        existingTransactions={transactions}
        categoryRules={categoryRules}
        accounts={accounts}
        defaultAccountId={importTargetAccountId}
        defaultMonth={summaryMonth}
        onSaveRule={onSaveRule}
        onSaveRulesBatch={onSaveRulesBatch}
      />

      {/* Add Manual Transaction Modal */}
      {isAddTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-offwhite-surface dark:bg-[#12141e] border border-zinc-300 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Add Manual Transaction
            </h3>
            <form onSubmit={handleAddManualTx} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1">Date</label>
                <input
                  type="date"
                  value={newTxDate}
                  onChange={(e) => setNewTxDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-offwhite-subtle dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                  required
                />
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Merchant / Payee</label>
                <input
                  type="text"
                  placeholder="e.g. Starbucks, NTUC FairPrice, Tech Corp Salary"
                  value={newTxMerchant}
                  onChange={(e) => setNewTxMerchant(e.target.value)}
                  className="w-full p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-offwhite-subtle dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-500 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newTxAmount}
                    onChange={(e) => setNewTxAmount(e.target.value)}
                    className="w-full p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-offwhite-subtle dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Type</label>
                  <select
                    value={newTxType}
                    onChange={(e) => setNewTxType(e.target.value as TransactionType)}
                    className="w-full p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-offwhite-subtle dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income (Salary / Deposit)</option>
                    <option value="refund">Refund</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-zinc-500 mb-1">Category</label>
                <select
                  value={newTxCategory}
                  onChange={(e) => setNewTxCategory(e.target.value as ExpenseCategory)}
                  className="w-full p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-offwhite-subtle dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                >
                  {ALL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTxModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold shadow-md shadow-brand-600/20"
                >
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Budgets Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-offwhite-surface dark:bg-[#12141e] border border-zinc-300 dark:border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              Adjust Monthly Category Budgets
            </h3>
            <p className="text-xs text-zinc-500">
              Set monthly spending targets to keep your expenses within cognitive guardrails.
            </p>
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {budgets.map((b, idx) => (
                <div key={b.category} className="flex items-center justify-between text-xs gap-3">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    {getCategoryIcon(b.category)}
                    {b.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-400">$</span>
                    <input
                      type="number"
                      value={b.monthlyLimit}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const copy = [...budgets];
                        copy[idx] = { ...copy[idx], monthlyLimit: val };
                        onUpdateBudgets(copy);
                      }}
                      className="w-24 p-1.5 text-right font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-offwhite-subtle dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold shadow-md shadow-brand-600/20"
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
