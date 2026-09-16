import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  UploadCloud, 
  Plus, 
  Search, 
  Calendar, 
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
import { MonthlyUploadTracker } from './MonthlyUploadTracker';
import { getTransactionTypeForCategory } from '../../utils/csvParser';
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
  'Food & Dining',
  'Groceries',
  'Transport & Petrol',
  'Shopping & E-Commerce',
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
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string | 'all'>('all');

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTargetAccountId, setImportTargetAccountId] = useState<string | undefined>(undefined);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

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

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedAccountId !== 'all' && tx.accountId !== selectedAccountId) return false;
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) return false;
      if (selectedType !== 'all' && tx.type !== selectedType) return false;
      if (selectedMonth !== 'all' && (!tx.date || !tx.date.startsWith(selectedMonth))) return false;

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
  }, [transactions, selectedAccountId, selectedCategory, selectedType, selectedMonth, searchQuery]);

  // Keep dashboard guidance anchored to one calendar month, even when the ledger shows all history.
  const summaryMonth = selectedMonth === 'all' ? new Date().toISOString().slice(0, 7) : selectedMonth;

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
      'Food & Dining': 0,
      'Groceries': 0,
      'Transport & Petrol': 0,
      'Shopping & E-Commerce': 0,
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

    // Unreviewed items
    const unreviewedCount = scope.filter((t) => !t.reviewed).length;

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
      unreviewedCount,
      dailyPace,
      projectedSpend,
      totalBudget,
      budgetRemaining: totalBudget - netSpend,
      expectedSpend,
      isOverPace: netSpend > expectedSpend,
    };
  }, [transactions, budgets, selectedAccountId, summaryMonth]);

  const balanceSummary = useMemo(() => {
    const liquidAssets = accounts
      .filter((account) => account.type === 'debit' || account.type === 'cash')
      .reduce((sum, account) => sum + account.currentBalance, 0);
    const liabilities = accounts
      .filter((account) => account.type === 'credit')
      .reduce((sum, account) => sum + Math.abs(account.currentBalance), 0);
    const uploadedAccountIds = new Set(
      uploadLogs.filter((upload) => upload.month === summaryMonth).map((upload) => upload.accountId)
    );

    return {
      liquidAssets,
      liabilities,
      netPosition: liquidAssets - liabilities,
      uploadedCount: accounts.filter((account) => uploadedAccountIds.has(account.id)).length,
    };
  }, [accounts, uploadLogs, summaryMonth]);

  // Category Icon Mapper
  const getCategoryIcon = (category: ExpenseCategory) => {
    switch (category) {
      case 'Salary & Income':
        return <Wallet className="w-3.5 h-3.5 text-emerald-500" />;
      case 'Food & Dining':
        return <Utensils className="w-3.5 h-3.5 text-amber-500" />;
      case 'Groceries':
        return <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />;
      case 'Transport & Petrol':
        return <Car className="w-3.5 h-3.5 text-blue-500" />;
      case 'Shopping & E-Commerce':
        return <Smile className="w-3.5 h-3.5 text-purple-500" />;
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
    onUpdateTransactions((prev) => [...newTxs, ...prev]);

    if (meta.accountName || meta.creditLimit || meta.closingBalance !== undefined) {
      onUpdateCardMeta({ ...cardMeta, ...meta });
    }

    if (uploadContext?.accountId) {
      if (uploadContext.closingBalance !== undefined) {
        onUpdateAccounts(
          accounts.map((a) =>
            a.id === uploadContext.accountId
              ? {
                  ...a,
                  currentBalance: uploadContext.closingBalance!,
                  lastReconciledMonth: uploadContext.month || a.lastReconciledMonth,
                }
              : a
          )
        );
      }

      const newLog: MonthlyAccountUpload = {
        id: `up_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        accountId: uploadContext.accountId,
        month: uploadContext.month || (newTxs[0]?.date ? newTxs[0].date.slice(0, 7) : new Date().toISOString().slice(0, 7)),
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

  const handleTriggerUploadForAccount = (accId?: string) => {
    setImportTargetAccountId(accId);
    setIsImportModalOpen(true);
  };

  const handleInlineCategoryChange = (txId: string, merchant: string, newCat: ExpenseCategory) => {
    onUpdateTransactions((prev) =>
      prev.map((t) => t.id === txId
        ? { ...t, category: newCat, type: getTransactionTypeForCategory(newCat, t.type), reviewed: true }
        : t)
    );

    const rulePattern = getManualCategoryRulePattern(newCat, merchant);
    if (rulePattern) {
      onSaveRule(rulePattern, newCat);
    }
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
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Selector */}
          <div className="flex items-center gap-1 bg-offwhite-surface dark:bg-zinc-900 border border-zinc-300/80 dark:border-zinc-800 rounded-xl px-2.5 py-1 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none text-xs cursor-pointer"
            >
              <option value="all">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

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

      {/* 2. Monthly Statement Reconciliation & Upload Tracker */}
      <MonthlyUploadTracker
        accounts={accounts}
        uploadLogs={uploadLogs}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        availableMonths={availableMonths}
        onTriggerUpload={handleTriggerUploadForAccount}
      />

      {/* Financial cockpit: position, spendable cash, pace, and statement completeness. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* Net position */}
        <div className="p-4 rounded-2xl bg-offwhite-surface dark:bg-zinc-900/80 border border-zinc-300/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Net Position</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-bold font-mono ${balanceSummary.netPosition >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              SGD ${balanceSummary.netPosition.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-500">
              <span>Assets ${balanceSummary.liquidAssets.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              <span>•</span>
              <span>Liabilities ${balanceSummary.liabilities.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>

        {/* Free to spend */}
        <div className="p-4 rounded-2xl bg-offwhite-surface dark:bg-zinc-900/80 border border-zinc-300/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Free to Spend</span>
            <CreditCard className="w-4 h-4 text-brand-500" />
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-bold font-mono ${stats.budgetRemaining >= 0 ? 'text-zinc-900 dark:text-zinc-100' : 'text-red-500'}`}>
              SGD ${Math.abs(stats.budgetRemaining).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
              <span>{stats.budgetRemaining >= 0 ? 'left from' : 'over'} ${stats.totalBudget.toLocaleString('en-US', { maximumFractionDigits: 0 })} monthly plan</span>
            </div>
          </div>
        </div>

        {/* Daily pace */}
        <div className="p-4 rounded-2xl bg-offwhite-surface dark:bg-zinc-900/80 border border-zinc-300/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Spending Pace</span>
            <TrendingUp className={`w-4 h-4 ${stats.isOverPace ? 'text-red-500' : 'text-emerald-500'}`} />
          </div>
          <div className="mt-2">
            <div className={`text-2xl font-bold font-mono ${stats.isOverPace ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
              {stats.isOverPace ? 'Over pace' : 'On pace'}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              ${stats.netSpend.toFixed(0)} spent • ${stats.expectedSpend.toFixed(0)} expected by today
            </div>
          </div>
        </div>

        {/* Statement coverage */}
        <div className="p-4 rounded-2xl bg-offwhite-surface dark:bg-zinc-900/80 border border-zinc-300/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Statement Coverage</span>
            <FileText className={`w-4 h-4 ${balanceSummary.uploadedCount === accounts.length && accounts.length > 0 ? 'text-emerald-500' : 'text-amber-500'}`} />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {balanceSummary.uploadedCount}/{accounts.length}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              {accounts.length === 0 ? 'Add an account to begin reconciliation' : `${Math.max(accounts.length - balanceSummary.uploadedCount, 0)} statement${accounts.length - balanceSummary.uploadedCount === 1 ? '' : 's'} still needed for ${summaryMonth}`}
            </div>
          </div>
        </div>
      </div>

      {/* Category Budget Breakdown Bar Section */}
      <div className="p-5 rounded-2xl bg-offwhite-surface dark:bg-zinc-900/80 border border-zinc-300/80 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            Category Budget Breakdown
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
          <div className="flex items-center gap-1 bg-offwhite-subtle dark:bg-zinc-900 p-1 rounded-xl border border-zinc-300/80 dark:border-zinc-800 text-xs self-start md:self-auto">
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
              onClick={() => setSelectedType('income')}
              className={`px-2.5 py-1 rounded-lg transition font-medium ${
                selectedType === 'income'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Income
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
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4">Clean Merchant</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
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

                    {/* Account Tag */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {(() => {
                        const acc = accounts.find((a) => a.id === tx.accountId) ||
                          accounts.find((a) => a.name.toLowerCase() === (tx.accountName || '').toLowerCase());
                        const color = acc?.color || '#a1a1aa';
                        const name = acc?.name || tx.accountName || 'Primary';
                        const type = acc?.type;

                        return (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                            <span>{name}</span>
                            {type && (
                              <span className="text-[8px] uppercase opacity-70">({type})</span>
                            )}
                          </span>
                        );
                      })()}
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
        defaultMonth={selectedMonth !== 'all' ? selectedMonth : undefined}
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
