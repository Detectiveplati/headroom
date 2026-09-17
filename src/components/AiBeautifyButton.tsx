import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Check, RotateCcw, Key, Settings2 } from 'lucide-react';
import {
  fetchBeautifiedTitle,
  getCachedTitle,
  getStoredGeminiApiKey,
  setStoredGeminiApiKey,
  BeautifyResult,
} from '../utils/aiBeautify';

interface AiBeautifyButtonProps {
  title: string;
  onApply: (newTitle: string) => void;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export const AiBeautifyButton: React.FC<AiBeautifyButtonProps> = ({
  title,
  onApply,
  size = 'xs',
  className = '',
  tooltipPosition = 'bottom',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isLocalFallback, setIsLocalFallback] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [previousTitle, setPreviousTitle] = useState<string | null>(null);
  const [isApplied, setIsApplied] = useState(false);

  // In-app API Key settings toggle
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getStoredGeminiApiKey());
  const [keySavedMessage, setKeySavedMessage] = useState(false);

  const dwellTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // If title changes from outside, reset suggestions
  useEffect(() => {
    if (suggestion && title !== suggestion && title !== previousTitle) {
      setSuggestion(null);
    }
  }, [title, suggestion, previousTitle]);

  const executeBeautify = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    // Check if already in cache
    const cached = getCachedTitle(trimmed);
    if (cached) {
      setSuggestion(cached);
      setIsOpen(true);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    try {
      const result: BeautifyResult = await fetchBeautifiedTitle(trimmed, controller.signal);
      setSuggestion(result.suggestedTitle);
      setIsLocalFallback(Boolean(result.isLocalFallback));
      setIsOpen(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Silent ignore if intentional abort
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMouseEnterContainer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    const trimmed = title.trim();
    if (!trimmed) return;

    if (suggestion) {
      setIsOpen(true);
      return;
    }

    // 300ms hover dwell debounce
    dwellTimerRef.current = setTimeout(() => {
      executeBeautify();
    }, 300);
  };

  const handleMouseLeaveContainer = () => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }

    // Do not abort immediately if in flight; give a grace period so moving toward popover doesn't cancel
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setShowKeyInput(false);
    }, 300);
  };

  const handleClickButton = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    // If suggestion is already ready and open, 1-click apply
    if (suggestion && suggestion !== title && isOpen) {
      handleApply(e);
      return;
    }

    // Immediate execution on click (skip hover dwell delay)
    if (!isLoading) {
      executeBeautify();
    }
  };

  const handleApply = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!suggestion || suggestion === title) return;

    setPreviousTitle(title);
    onApply(suggestion);
    setIsApplied(true);
    setTimeout(() => setIsApplied(false), 1500);
    setIsOpen(false);
  };

  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previousTitle) {
      onApply(previousTitle);
      setPreviousTitle(null);
      setIsOpen(false);
    }
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredGeminiApiKey(apiKeyInput);
    setKeySavedMessage(true);
    setTimeout(() => setKeySavedMessage(false), 2000);
    // Re-run beautification with new key
    executeBeautify();
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  const btnPaddings = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
  };

  const getPopoverPositionClasses = () => {
    switch (tooltipPosition) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-1.5';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-1.5';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-1.5';
      case 'bottom':
      default:
        return 'top-full left-0 mt-1.5';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center gap-1 ${className}`}
      onMouseEnter={handleMouseEnterContainer}
      onMouseLeave={handleMouseLeaveContainer}
    >
      {/* AI Trigger / Apply Button */}
      <button
        type="button"
        onClick={handleClickButton}
        className={`rounded-lg transition flex items-center justify-center ${btnPaddings[size]} ${
          isLoading
            ? 'bg-brand-500/20 text-brand-500 animate-pulse'
            : isApplied
            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'text-brand-500 hover:text-brand-600 dark:hover:text-brand-300 hover:bg-brand-500/10 active:scale-95'
        }`}
        title="AI Summarize & Beautify Title (Click or hover to preview)"
        aria-label="AI Summarize Title"
      >
        {isLoading ? (
          <Loader2 className={`${iconSizes[size]} animate-spin text-brand-500`} />
        ) : isApplied ? (
          <Check className={`${iconSizes[size]} text-emerald-500`} />
        ) : (
          <Sparkles className={`${iconSizes[size]}`} />
        )}
      </button>

      {/* Undo Button if previously replaced */}
      {previousTitle && (
        <button
          type="button"
          onClick={handleUndo}
          className={`rounded-lg transition text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 ${btnPaddings[size]}`}
          title={`Undo AI title (Revert to: "${previousTitle}")`}
          aria-label="Undo title change"
        >
          <RotateCcw className={`${iconSizes[size]}`} />
        </button>
      )}

      {/* Hover/Click Preview Popover with Hover Bridge */}
      {isOpen && suggestion && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute z-50 min-w-[250px] max-w-xs p-2.5 rounded-xl shadow-xl border text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 animate-in fade-in zoom-in-95 duration-100 select-text ${getPopoverPositionClasses()}`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-1 text-[10px] uppercase font-mono tracking-wider text-brand-600 dark:text-brand-400 font-semibold">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand-500" />
                Suggested Title
              </span>
              <span className="text-[9px] text-zinc-400 font-normal lowercase bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                {isLocalFallback ? 'Smart Clean' : 'Gemini 3.1'}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 font-medium text-xs text-zinc-900 dark:text-zinc-100 leading-snug">
              {suggestion}
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 transition"
                title="Configure Gemini API Key"
              >
                <Settings2 className="w-3 h-3" />
                <span>API Key</span>
              </button>

              {suggestion !== title ? (
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium text-[11px] shadow-xs transition active:scale-95 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Apply
                </button>
              ) : (
                <span className="text-[10px] text-zinc-400">Already concise</span>
              )}
            </div>

            {/* In-app Gemini API Key Config Drawer */}
            {showKeyInput && (
              <form onSubmit={handleSaveApiKey} className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium">
                  <Key className="w-3 h-3 text-brand-500" />
                  <span>Google AI Studio Key:</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="password"
                    placeholder="Paste GEMINI_API_KEY..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="flex-1 text-[11px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 rounded-md bg-brand-600 text-white text-[10px] font-semibold hover:bg-brand-500"
                  >
                    Save
                  </button>
                </div>
                {keySavedMessage && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    ✓ Key saved! Live Gemini AI activated.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
