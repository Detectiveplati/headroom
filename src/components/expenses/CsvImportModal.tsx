import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  ArrowRight, 
  Info, 
  CreditCard,
  Sparkles,
  Loader2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { Transaction, ExpenseCategory, CardMetaInfo } from '../../types';
import { parseBankStatementCsv, getTransactionSignature } from '../../utils/csvParser';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newTransactions: Transaction[], meta: CardMetaInfo) => void;
  existingTransactions: Transaction[];
  categoryRules: Record<string, ExpenseCategory>;
}

const ALL_CATEGORIES: ExpenseCategory[] = [
  'Food & Dining',
  'Groceries',
  'Transport & Petrol',
  'Shopping & E-Commerce',
  'Entertainment & Gaming',
  'Personal Care & Services',
  'Bills & Utilities',
  'Transfer / Payment',
  'Uncategorized',
];

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingTransactions,
  categoryRules,
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const applyTransactionsAndDedupe = (
    transactions: Transaction[], 
    meta: CardMetaInfo,
    rawText?: string
  ) => {
    if (rawText !== undefined) setCsvText(rawText);
    setParsedTransactions(transactions);
    setParsedMeta(meta);

    // Identify duplicates against existing transactions
    const existingSigs = new Set(existingTransactions.map((t) => getTransactionSignature(t)));
    const dupes = new Set<string>();
    const selected = new Set<string>();

    transactions.forEach((tx) => {
      const sig = getTransactionSignature(tx);
      if (existingSigs.has(sig)) {
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
    const result = parseBankStatementCsv(text, existingTransactions, categoryRules);
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
    setParsedTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, category: newCategory } : tx))
    );
  };

  const handleConfirmImport = () => {
    const toImport = parsedTransactions.filter((tx) => selectedTxIds.has(tx.id));
    if (toImport.length === 0) return;
    onImport(toImport, parsedMeta);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setCsvText('');
    setParsedTransactions([]);
    setParsedMeta({});
    setSelectedTxIds(new Set());
    setDuplicateIds(new Set());
    setFileName(null);
    setIsAiLoading(false);
    setErrorMessage(null);
  };

  // Metrics on parsed batch
  const totalDebits = parsedTransactions
    .filter((t) => t.type === 'expense' && selectedTxIds.has(t.id))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRefunds = parsedTransactions
    .filter((t) => t.type === 'refund' && selectedTxIds.has(t.id))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalTransfers = parsedTransactions
    .filter((t) => t.type === 'transfer' && selectedTxIds.has(t.id))
    .reduce((sum, t) => sum + t.amount, 0);

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

              {/* Batch Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
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
                  <span className="text-zinc-500">Refunds & Credits</span>
                  <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
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

                <button
                  type="button"
                  onClick={handleReset}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  Clear & choose another file
                </button>
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
                    {parsedTransactions.map((tx) => {
                      const isDupe = duplicateIds.has(tx.id);
                      const isSelected = selectedTxIds.has(tx.id);

                      return (
                        <tr
                          key={tx.id}
                          onClick={() => toggleSelectTx(tx.id)}
                          className={`hover:bg-zinc-100/70 dark:hover:bg-zinc-800/40 cursor-pointer transition ${
                            !isSelected ? 'opacity-40' : ''
                          } ${isDupe ? 'bg-amber-500/5' : ''}`}
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
                                  : tx.type === 'refund'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
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
                                  : tx.type === 'refund'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-blue-600 dark:text-blue-400'
                              }
                            >
                              {tx.type === 'refund' ? '+' : tx.type === 'expense' ? '-' : ''}${tx.amount.toFixed(2)}
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
