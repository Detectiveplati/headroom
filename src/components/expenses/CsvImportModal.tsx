import React, { useMemo, useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  ArrowRight, 
  Info, 
  CreditCard,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { 
  Transaction, 
  ExpenseCategory, 
  CardMetaInfo, 
  CategorizedRuleResult,
  TrackedAccount,
  AccountType
} from '../../types';
import { getTransactionTypeForCategory, parseBankStatementCsv, getTransactionSignature } from '../../utils/csvParser';
import { getManualCategoryRulePattern } from '../../utils/manualCategoryRule';

export interface StatementUploadContext {
  accountId?: string;
  month?: string;
  closingBalance?: number;
  startingBalance?: number;
  fileName?: string;
}

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    newTransactions: Transaction[], 
    meta: CardMetaInfo,
    uploadContext?: StatementUploadContext
  ) => void;
  existingTransactions: Transaction[];
  categoryRules: Record<string, ExpenseCategory>;
  accounts?: TrackedAccount[];
  defaultAccountId?: string;
  defaultMonth?: string;
  onSaveRule?: (pattern: string, category: ExpenseCategory) => void;
  onSaveRulesBatch?: (newRules: Record<string, ExpenseCategory>) => void;
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

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingTransactions,
  categoryRules,
  accounts = [],
  defaultAccountId,
  defaultMonth,
  onSaveRule,
  onSaveRulesBatch,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [isManualPaste, setIsManualPaste] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<Transaction[]>([]);
  const [parsedMeta, setParsedMeta] = useState<CardMetaInfo>({});
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set());
  const [fileName, setFileName] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiCategorizing, setIsAiCategorizing] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Multi-account reconciliation states
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    defaultAccountId || ''
  );
  const [statementMonth, setStatementMonth] = useState<string>(
    defaultMonth || new Date().toISOString().slice(0, 7)
  );
  const [customClosingBalance, setCustomClosingBalance] = useState<string>('');
  const [accountTypeOverride, setAccountTypeOverride] = useState<AccountType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) setSelectedAccountId(defaultAccountId || '');
    if (defaultMonth) setStatementMonth(defaultMonth);
  }, [defaultAccountId, defaultMonth, isOpen]);

  const stagedTransactions = useMemo(
    () =>
      [...parsedTransactions].sort(
        (a, b) => Number(b.category === 'Uncategorized') - Number(a.category === 'Uncategorized')
      ),
    [parsedTransactions]
  );

  if (!isOpen) return null;

  const applyTransactionsAndDedupe = (
    transactions: Transaction[], 
    meta: CardMetaInfo,
    rawText?: string,
    overrideAccId?: string
  ) => {
    if (rawText !== undefined) setCsvText(rawText);
    setParsedTransactions(transactions);
    setParsedMeta(meta);
    setAccountTypeOverride(meta.accountType || null);

    if (meta.closingBalance !== undefined) {
      setCustomClosingBalance(String(meta.closingBalance));
    }

    // Auto-match account if meta has accountName and no explicit override
    let targetAccId = overrideAccId || selectedAccountId;
    if (!overrideAccId && meta.accountName && accounts.length > 0) {
      const lowerMeta = meta.accountName.toLowerCase();
      const matched = accounts.find((a) => 
        lowerMeta.includes(a.name.toLowerCase()) || 
        (a.institution && lowerMeta.includes(a.institution.toLowerCase()))
      );
      if (matched) {
        targetAccId = matched.id;
        setSelectedAccountId(matched.id);
      }
    }

    // Auto-detect statement month from transactions date
    if (transactions.length > 0) {
      const firstValidDate = transactions.find((t) => t.date && t.date.length >= 7);
      if (firstValidDate) {
        setStatementMonth(firstValidDate.date.slice(0, 7));
      }
    }

    // Identify duplicates against existing transactions (account-aware)
    const existingSigs = new Set<string>();
    for (const t of existingTransactions) {
      existingSigs.add(getTransactionSignature(t));
      if (targetAccId && t.accountId === targetAccId) {
        existingSigs.add(getTransactionSignature(t, targetAccId));
      }
    }

    const dupes = new Set<string>();
    const selected = new Set<string>();

    transactions.forEach((tx) => {
      const sigWithAcc = getTransactionSignature(tx, targetAccId);
      const sigWithoutAcc = getTransactionSignature(tx, '');
      if (existingSigs.has(sigWithAcc) || existingSigs.has(sigWithoutAcc)) {
        dupes.add(tx.id);
      } else {
        selected.add(tx.id);
      }
    });

    setDuplicateIds(dupes);
    setSelectedTxIds(skipDuplicates ? selected : new Set(transactions.map((t) => t.id)));
  };

  const handleProcessCsv = (text: string, name?: string) => {
    if (name) setFileName(name);
    setErrorMessage(null);
    const result = parseBankStatementCsv(text, existingTransactions, categoryRules, selectedAccountId);
    applyTransactionsAndDedupe(result.transactions, result.meta, text);
  };

  const handleIncomingFile = async (file: File) => {
    setFileName(file.name);
    setErrorMessage(null);

    const isPdfOrImage = 
      file.type === 'application/pdf' || 
      file.type.startsWith('image/') || 
      file.name.toLowerCase().endsWith('.pdf') || 
      file.name.toLowerCase().endsWith('.png') || 
      file.name.toLowerCase().endsWith('.jpg') || 
      file.name.toLowerCase().endsWith('.jpeg') || 
      file.name.toLowerCase().endsWith('.webp');

    if (isPdfOrImage) {
      setIsAiLoading(true);
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result as string;
            const commaIdx = res.indexOf(',');
            resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
          };
          reader.onerror = () => reject(new Error('Failed to read file from disk'));
          reader.readAsDataURL(file);
        });

        const res = await fetch('/api/expenses/parse-statement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64Data,
            mimeType: file.type || 'application/pdf',
            fileName: file.name,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to extract transactions from statement');
        }

        if (!data.transactions || data.transactions.length === 0) {
          throw new Error('No transactions found in this document. Please check the file quality.');
        }

        applyTransactionsAndDedupe(data.transactions, data.meta || {});
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to parse statement';
        setErrorMessage(msg);
      } finally {
        setIsAiLoading(false);
      }
    } else {
      // Fast local CSV parsing
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        handleProcessCsv(content, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    handleIncomingFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleIncomingFile(file);
  };

  const toggleSelectTx = (id: string) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTxIds.size === parsedTransactions.length) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(parsedTransactions.map((t) => t.id)));
    }
  };

  const handleCategoryChange = (id: string, newCategory: ExpenseCategory) => {
    const currentTransaction = parsedTransactions.find((tx) => tx.id === id);
    if (!currentTransaction) return;

    setParsedTransactions((prev) =>
      prev.map((tx) => tx.id === id
        ? { ...tx, category: newCategory, type: getTransactionTypeForCategory(newCategory, tx.type) }
        : tx)
    );

    if (currentTransaction.category === newCategory) return;

    const rulePattern = getManualCategoryRulePattern(
      newCategory,
      currentTransaction.cleanMerchant || currentTransaction.rawDescription
    );

    if (rulePattern && onSaveRule) {
      onSaveRule(rulePattern, newCategory);
      setAiNotice(`Saved “${rulePattern}” as ${newCategory} for future imports.`);
    }
  };

  const handleSelectAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId);
    if (parsedTransactions.length > 0) {
      applyTransactionsAndDedupe(parsedTransactions, parsedMeta, undefined, accountId);
    }
  };

  const handleConfirmImport = () => {
    const toImport = parsedTransactions.filter((tx) => selectedTxIds.has(tx.id));
    if (toImport.length === 0) return;

    const chosenAccount = accounts.find((a) => a.id === selectedAccountId);
    const resolvedAccountType = parsedMeta.accountType || accountTypeOverride || chosenAccount?.type;
    if (!resolvedAccountType) {
      setErrorMessage('Choose whether this is a debit/savings or credit-card statement before importing.');
      return;
    }
    const enrichedTxs = toImport.map((tx) => ({
      ...tx,
      accountId: selectedAccountId || undefined,
      accountName: chosenAccount?.name || tx.accountName || parsedMeta.accountName,
    }));

    const closingBal = customClosingBalance.trim() !== '' 
      ? parseFloat(customClosingBalance) 
      : parsedMeta.closingBalance;

    onImport(enrichedTxs, { ...parsedMeta, accountType: resolvedAccountType }, {
      accountId: selectedAccountId,
      month: statementMonth,
      closingBalance: !isNaN(Number(closingBal)) ? Number(closingBal) : undefined,
      startingBalance: parsedMeta.openingBalance,
      fileName: fileName || 'Statement',
    });

    handleReset();
    onClose();
  };

  const handleAutoCategorizeUnknown = async () => {
    const uncategorized = parsedTransactions.filter((t) => t.category === 'Uncategorized');
    if (uncategorized.length === 0) return;

    setIsAiCategorizing(true);
    setAiNotice(null);
    setErrorMessage(null);

    try {
      // The API accepts compact batches of 100 descriptions. This avoids repeating the
      // categorization prompt per transaction while keeping response size predictable.
      const batchSize = 100;
      const batches = Array.from(
        { length: Math.ceil(uncategorized.length / batchSize) },
        (_, index) => uncategorized.slice(index * batchSize, (index + 1) * batchSize)
          .map((transaction) => transaction.rawDescription)
      );
      const responses = await Promise.all(
        batches.map(async (items) => {
          const res = await fetch('/api/expenses/categorize-unknown', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to categorize unknown transactions');
          }
          return data as { categorized?: CategorizedRuleResult[]; newRules?: Record<string, ExpenseCategory> };
        })
      );

      const categorized = responses.flatMap((response) => response.categorized || []);
      const newRules = Object.assign({}, ...responses.map((response) => response.newRules || {}));

      const resultsMap = new Map<string, CategorizedRuleResult>();
      for (const item of categorized) {
        resultsMap.set(String(item.rawDescription || '').trim().toUpperCase(), item);
      }

      setParsedTransactions((prev) =>
        prev.map((tx) => {
          const match = resultsMap.get(tx.rawDescription.trim().toUpperCase());
          if (match) {
            return {
              ...tx,
              cleanMerchant: match.cleanMerchant || tx.cleanMerchant,
              category: match.category || tx.category,
              type: match.type || tx.type,
            };
          }
          return tx;
        })
      );

      if (Object.keys(newRules).length > 0) {
        if (onSaveRulesBatch) {
          onSaveRulesBatch(newRules);
        } else if (onSaveRule) {
          for (const [pat, cat] of Object.entries(newRules)) {
            onSaveRule(pat, cat as ExpenseCategory);
          }
        }
        setAiNotice(`Learned and saved ${Object.keys(newRules).length} new regex rule(s) to database!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI categorization failed';
      setErrorMessage(msg);
    } finally {
      setIsAiCategorizing(false);
    }
  };

  const handleReset = () => {
    setCsvText('');
    setParsedTransactions([]);
    setParsedMeta({});
    setSelectedTxIds(new Set());
    setDuplicateIds(new Set());
    setFileName(null);
    setIsAiLoading(false);
    setIsAiCategorizing(false);
    setAiNotice(null);
    setErrorMessage(null);
    setAccountTypeOverride(null);
  };

  // Metrics on parsed batch
  const totalDebits = parsedTransactions
    .filter((t) => t.type === 'expense' && selectedTxIds.has(t.id))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = parsedTransactions
    .filter((t) => t.type === 'income' && selectedTxIds.has(t.id))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRefunds = parsedTransactions
    .filter((t) => t.type === 'refund' && selectedTxIds.has(t.id))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalTransfers = parsedTransactions
    .filter((t) => t.type === 'transfer' && selectedTxIds.has(t.id))
    .reduce((sum, t) => sum + t.amount, 0);

  const uncategorizedCount = parsedTransactions.filter((t) => t.category === 'Uncategorized').length;
  const needsAccountTypeChoice = parsedTransactions.length > 0 && !parsedMeta.accountType && !accountTypeOverride;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-offwhite-surface dark:bg-[#12141e] border border-zinc-300/80 dark:border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-500/30">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base flex items-center gap-2">
                <span>Import Bank Statement</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30">
                  PDF & CSV
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Local-first CSV or AI statement extraction powered by Gemini 2.0 Flash-Lite.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isAiLoading ? (
            /* Gemini AI Processing State */
            <div className="border border-brand-500/30 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-brand-500/5 animate-pulse">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/20 text-brand-500 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 animate-spin text-brand-500" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center shadow">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
              </div>
              <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                Extracting with Gemini Flash-Lite...
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mb-2">
                Analyzing <span className="font-mono text-zinc-700 dark:text-zinc-300 font-medium">{fileName}</span> to structure dates, merchants, amounts, and categories.
              </p>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-600 dark:text-brand-400 bg-brand-500/10 px-3 py-1 rounded-full">
                <span>Free / low-cost Flash-Lite model</span>
              </div>
            </div>
          ) : parsedTransactions.length === 0 ? (
            /* Upload / Drop State */
            <div className="space-y-4">
              {errorMessage && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold mb-1">Statement Extraction Notice</p>
                    <p className="text-red-600/90 dark:text-red-300/90">{errorMessage}</p>
                    {errorMessage.includes('GEMINI_API_KEY') && (
                      <p className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                        To resolve: in Railway, navigate to your service settings &rarr; <strong>Variables</strong> &rarr; add <code className="font-mono px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded">GEMINI_API_KEY</code>.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? 'border-brand-500 bg-brand-500/10 scale-[0.99]'
                    : 'border-zinc-300 dark:border-zinc-800 hover:border-brand-500/50 bg-offwhite-subtle/50 dark:bg-zinc-900/40 hover:bg-offwhite-subtle dark:hover:bg-zinc-900/80'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".csv,text/csv,application/pdf,.pdf,image/*,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                  Drag and drop your bank statement PDF or CSV here
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-3">
                  Supports DBS/POSB Mastercard, Visa, bank statement PDFs, receipts, and CSV files.
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-emerald-500" /> Local CSV
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center gap-1 border border-brand-500/20">
                    <Sparkles className="w-3 h-3 text-brand-500" /> Gemini Flash-Lite PDF
                  </span>
                </div>
                <span className="text-xs font-medium px-3 py-1 rounded-lg bg-brand-600 text-white shadow-sm hover:bg-brand-500 transition">
                  Browse Files
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Or paste raw CSV text</span>
                <button
                  type="button"
                  onClick={() => setIsManualPaste(!isManualPaste)}
                  className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
                >
                  {isManualPaste ? 'Hide paste box' : 'Paste CSV text manually'}
                </button>
              </div>

              {isManualPaste && (
                <div className="space-y-2">
                  <textarea
                    rows={6}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="Paste CSV lines here..."
                    className="w-full font-mono text-xs p-3 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-offwhite-subtle dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleProcessCsv(csvText, 'Manual Paste')}
                      disabled={!csvText.trim()}
                      className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 text-white disabled:opacity-50 hover:bg-brand-500 transition"
                    >
                      Parse Text
                    </button>
                  </div>
                </div>
              )}

              {/* Cognitive Privacy Callout */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Privacy Note:</span> CSV statements are parsed 100% locally in browser memory. PDF/receipt uploads are securely parsed via your Railway Gemini API key.
                </div>
              </div>
            </div>
          ) : (
            /* Review & Staging View */
            <div className="space-y-4">
              {/* Account Meta Pill */}
              {parsedMeta.accountName && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-300/80 dark:border-zinc-800 text-xs">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {parsedMeta.accountName}
                    </span>
                    {fileName && (
                      <span className="text-zinc-400 font-mono text-[11px]">({fileName})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-zinc-600 dark:text-zinc-400">
                    {parsedMeta.creditLimit !== undefined && (
                      <span>
                        Limit: <strong className="font-mono text-zinc-800 dark:text-zinc-200">SGD {parsedMeta.creditLimit.toLocaleString()}</strong>
                      </span>
                    )}
                    {parsedMeta.availableLimit !== undefined && (
                      <span>
                        Available: <strong className="font-mono text-emerald-600 dark:text-emerald-400">SGD {parsedMeta.availableLimit.toLocaleString()}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {needsAccountTypeChoice && (
                <fieldset className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs">
                  <legend className="px-1 text-amber-700 dark:text-amber-300 font-semibold">
                    Statement type needed before import
                  </legend>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-2.5">
                    We could not reliably identify this statement. Is it from a debit/savings account or a credit card?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition ${accountTypeOverride === 'debit' ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-200' : 'border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'}`}>
                      <input
                        type="radio"
                        name="statement-account-type"
                        checked={accountTypeOverride === 'debit'}
                        onChange={() => {
                          setAccountTypeOverride('debit');
                          setErrorMessage(null);
                        }}
                        className="text-brand-600 focus:ring-brand-500"
                      />
                      Debit / savings account
                    </label>
                    <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition ${accountTypeOverride === 'credit' ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-200' : 'border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'}`}>
                      <input
                        type="radio"
                        name="statement-account-type"
                        checked={accountTypeOverride === 'credit'}
                        onChange={() => {
                          setAccountTypeOverride('credit');
                          setErrorMessage(null);
                        }}
                        className="text-brand-600 focus:ring-brand-500"
                      />
                      Credit card statement
                    </label>
                  </div>
                </fieldset>
              )}

              {/* Multi-Account & Balance Sheet Reconciliation Target Bar */}
              <div className="p-3.5 rounded-xl bg-offwhite-subtle dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">Target Account:</span>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => handleSelectAccountChange(e.target.value)}
                      className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer text-xs"
                    >
                      <option value="">
                        {accounts.length ? 'Use detected statement account' : 'Create from detected statement account'}
                      </option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type.toUpperCase()}) - {acc.institution}
                        </option>
                      ))}
                    </select>
                    {!accounts.length && !parsedMeta.accountName && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">
                        An account name must be detected to track this statement.
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500">Statement Month:</span>
                      <input
                        type="month"
                        value={statementMonth}
                        onChange={(e) => setStatementMonth(e.target.value)}
                        className="px-2 py-0.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500">Closing Balance:</span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-xs">$</span>
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={customClosingBalance}
                          onChange={(e) => setCustomClosingBalance(e.target.value)}
                          className="w-24 pl-5 pr-2 py-0.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-right"
                          title="Closing statement balance extracted from statement (editable)"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deduplication Guarantee Banner */}
                {duplicateIds.size > 0 ? (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>
                        <strong>{duplicateIds.size} duplicate transactions skipped:</strong> Rows overlapping with existing transactions in this account were automatically deselected. Only <strong>{selectedTxIds.size} missing/new transactions</strong> will be added.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>
                      Zero duplicates detected. All <strong>{selectedTxIds.size} transactions</strong> are unique and ready to import.
                    </span>
                  </div>
                )}
              </div>

              {/* Batch Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-300/70 dark:border-zinc-800">
                  <span className="text-zinc-500">Selected Rows</span>
                  <div className="font-bold text-sm text-zinc-800 dark:text-zinc-100">
                    {selectedTxIds.size} <span className="text-[11px] font-normal text-zinc-400">of {parsedTransactions.length}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-300/70 dark:border-zinc-800">
                  <span className="text-zinc-500">Debits (Spend)</span>
                  <div className="font-bold text-sm text-red-600 dark:text-red-400 font-mono">
                    -${totalDebits.toFixed(2)}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-300/70 dark:border-zinc-800">
                  <span className="text-zinc-500">Income (Salaries)</span>
                  <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                    +${totalIncome.toFixed(2)}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-300/70 dark:border-zinc-800">
                  <span className="text-zinc-500">Refunds & Credits</span>
                  <div className="font-bold text-sm text-teal-600 dark:text-teal-400 font-mono">
                    +${totalRefunds.toFixed(2)}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-offwhite-subtle dark:bg-zinc-900 border border-zinc-300/70 dark:border-zinc-800">
                  <span className="text-zinc-500">Card Bill Payments</span>
                  <div className="font-bold text-sm text-blue-600 dark:text-blue-400 font-mono" title="Excluded from expenses to prevent double-counting">
                    ${totalTransfers.toFixed(2)}
                  </div>
                </div>
              </div>

              {aiNotice && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 animate-fade-in">
                  <span>✨ {aiNotice}</span>
                  <button onClick={() => setAiNotice(null)} className="text-emerald-500 hover:text-emerald-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Controls bar */}
              <div className="flex items-center justify-between text-xs pt-1 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    {selectedTxIds.size === parsedTransactions.length ? 'Deselect All' : 'Select All'}
                  </button>

                  {duplicateIds.size > 0 && (
                    <label className="flex items-center gap-1.5 cursor-pointer text-amber-600 dark:text-amber-400">
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSkipDuplicates(checked);
                          if (checked) {
                            setSelectedTxIds((prev) => {
                              const next = new Set(prev);
                              duplicateIds.forEach((id) => next.delete(id));
                              return next;
                            });
                          }
                        }}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span>Skip {duplicateIds.size} potential duplicate{duplicateIds.size > 1 ? 's' : ''}</span>
                    </label>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {uncategorizedCount > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoCategorizeUnknown}
                      disabled={isAiCategorizing}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-brand-500/20 transition active:scale-95 disabled:opacity-50"
                      title="Send only unknown transactions to Gemini Flash-Lite, learn reusable regex rules, and save them to the database"
                    >
                      {isAiCategorizing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Classifying {uncategorizedCount} unknown...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>AI Categorize {uncategorizedCount} unknown</span>
                          <span className="text-[10px] px-1 py-0.5 bg-white/20 rounded font-normal">
                            Saves regex to DB
                          </span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    Clear & choose another file
                  </button>
                </div>
              </div>

              {/* Staging Table */}
              <div className="border border-zinc-300/80 dark:border-zinc-800 rounded-xl overflow-hidden bg-offwhite-surface dark:bg-zinc-900/60 max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-offwhite-subtle dark:bg-zinc-900 sticky top-0 z-10 text-zinc-500 border-b border-zinc-300/70 dark:border-zinc-800">
                    <tr>
                      <th className="py-2 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedTxIds.size === parsedTransactions.length}
                          onChange={toggleSelectAll}
                          className="rounded text-brand-600 focus:ring-brand-500"
                        />
                      </th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Clean Merchant</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                    {stagedTransactions.map((tx) => {
                      const isDupe = duplicateIds.has(tx.id);
                      const isSelected = selectedTxIds.has(tx.id);
                      const isUncategorized = tx.category === 'Uncategorized';

                      return (
                        <tr
                          key={tx.id}
                          onClick={() => toggleSelectTx(tx.id)}
                          className={`hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 cursor-pointer transition ${
                            !isSelected ? 'opacity-40' : ''
                          } ${isDupe ? 'bg-amber-500/5' : ''} ${isUncategorized ? 'bg-brand-500/5 ring-1 ring-inset ring-brand-500/20' : ''}`}
                        >
                          <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectTx(tx.id)}
                              className="rounded text-brand-600 focus:ring-brand-500"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                            {tx.date}
                          </td>
                          <td className="py-2 px-3 max-w-[200px] truncate">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                              {tx.cleanMerchant}
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate" title={tx.rawDescription}>
                              {tx.rawDescription}
                            </div>
                          </td>
                          <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={tx.category}
                              onChange={(e) =>
                                handleCategoryChange(tx.id, e.target.value as ExpenseCategory)
                              }
                              className="text-[11px] py-0.5 px-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-offwhite-surface dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-brand-500"
                            >
                              {ALL_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                                tx.type === 'expense'
                                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                                  : tx.type === 'income'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : tx.type === 'refund'
                                  ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold whitespace-nowrap">
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
                              {tx.type === 'income' || tx.type === 'refund' ? '+' : tx.type === 'expense' ? '-' : ''}${tx.amount.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-offwhite-subtle/50 dark:bg-zinc-900/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            Cancel
          </button>

          {parsedTransactions.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={selectedTxIds.size === 0}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/25 hover:bg-brand-500 disabled:opacity-50 transition active:scale-95"
            >
              <span>Import {selectedTxIds.size} Transactions</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
