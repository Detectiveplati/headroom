import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Check, RotateCcw, AlertCircle } from 'lucide-react';
import { fetchBeautifiedTitle, getCachedTitle } from '../utils/aiBeautify';

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
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [previousTitle, setPreviousTitle] = useState<string | null>(null);
  const [isCopiedOrApplied, setIsCopiedOrApplied] = useState(false);

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
      setError(null);
    }
  }, [title, suggestion, previousTitle]);

  const executeBeautify = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    // Check if already in cache
    const cached = getCachedTitle(trimmed);
    if (cached) {
      setSuggestion(cached);
      setError(null);
      setIsOpen(true);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchBeautifiedTitle(trimmed, controller.signal);
      setSuggestion(result.suggestedTitle);
      setIsOpen(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request cancelled by unhover - silent ignore
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to beautify';
      setError(message);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    const trimmed = title.trim();
    if (!trimmed) return;

    // If we already have a suggestion or cache for this title, show preview immediately
    const cached = getCachedTitle(trimmed);
    if (cached) {
      setSuggestion(cached);
      setIsOpen(true);
      return;
    }

    if (suggestion) {
      setIsOpen(true);
      return;
    }

    // 400ms hover dwell debounce to avoid firing on accidental mouse-over
    dwellTimerRef.current = setTimeout(() => {
      executeBeautify();
    }, 400);
  };

  const handleMouseLeave = () => {
    // Cancel pending dwell timer
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }

    // If request is still in flight when user moves away, abort it to save bandwidth & computation
    if (isLoading && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }

    // Grace period before closing popover so user can move mouse into popover
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleApply = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!suggestion || suggestion === title) return;

    setPreviousTitle(title);
    onApply(suggestion);
    setIsCopiedOrApplied(true);
    setTimeout(() => setIsCopiedOrApplied(false), 1500);
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

  const handleClickButton = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (suggestion && suggestion !== title) {
      handleApply(e);
    } else if (!isLoading) {
      executeBeautify();
    }
  };

  // Sizing styles
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

  // Tooltip positioning classes
  const getPopoverPositionClasses = () => {
    switch (tooltipPosition) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'bottom':
      default:
        return 'top-full left-0 mt-2';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center gap-1 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* AI Trigger / Apply Button */}
      <button
        type="button"
        onClick={handleClickButton}
        className={`rounded-lg transition flex items-center justify-center ${btnPaddings[size]} ${
          isLoading
            ? 'bg-brand-500/20 text-brand-500 animate-pulse'
            : isCopiedOrApplied
            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'text-brand-500/80 hover:text-brand-600 dark:hover:text-brand-300 hover:bg-brand-500/10 active:scale-95'
        }`}
        title="AI Summarize & Beautify Title (Hover to preview, click to apply)"
        aria-label="AI Summarize Title"
      >
        {isLoading ? (
          <Loader2 className={`${iconSizes[size]} animate-spin text-brand-500`} />
        ) : isCopiedOrApplied ? (
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

      {/* Hover Preview Popover */}
      {isOpen && (suggestion || error) && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute z-50 min-w-[240px] max-w-xs p-2.5 rounded-xl shadow-xl border text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 animate-in fade-in zoom-in-95 duration-150 select-text ${getPopoverPositionClasses()}`}
        >
          {error ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>AI Beautify</span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-tight">
                {error.includes('GEMINI_API_KEY')
                  ? 'Set GEMINI_API_KEY in your .env to enable AI title beautification.'
                  : error}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1 text-[10px] uppercase font-mono tracking-wider text-brand-600 dark:text-brand-400 font-semibold">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-500" />
                  Suggested Title
                </span>
                <span className="text-[9px] text-zinc-400 font-normal lowercase">Gemini 3.1</span>
              </div>

              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 font-medium text-xs text-zinc-900 dark:text-zinc-100 leading-snug">
                {suggestion}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  {suggestion === title ? 'Already concise' : '1-click apply'}
                </span>
                {suggestion !== title && (
                  <button
                    type="button"
                    onClick={handleApply}
                    className="px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium text-[11px] shadow-xs transition active:scale-95 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Apply
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
