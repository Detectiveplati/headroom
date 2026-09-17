import React, { useState, useRef, useEffect } from 'react';
import { CalendarPlus, Check, ExternalLink, Download } from 'lucide-react';
import { Task } from '../types';
import {
  addToNativeCalendar,
  generateGoogleCalendarUrl,
  downloadIcsFile,
  getClientDevice,
} from '../utils/calendarIntegration';

interface CalendarButtonProps {
  task: Task;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export const CalendarButton: React.FC<CalendarButtonProps> = ({
  task,
  size = 'xs',
  showLabel = false,
  className = '',
  tooltipPosition = 'bottom',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleQuickPress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const device = getClientDevice();

    if (device === 'ios' || device === 'android') {
      // Mobile: 1-click direct integration into native calendar
      const result = await addToNativeCalendar(task);
      if (result.success) {
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 2000);
      }
    } else {
      // Desktop: Toggle menu for Google Calendar vs Apple/Outlook (.ics)
      setIsOpen(!isOpen);
    }
  };

  const handleGoogleCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = generateGoogleCalendarUrl(task);
    window.open(url, '_blank');
    setIsAdded(true);
    setIsOpen(false);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleAppleOrOutlook = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadIcsFile(task);
    setIsAdded(true);
    setIsOpen(false);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  const btnPaddings = {
    xs: 'p-1 text-xs',
    sm: 'p-1.5 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
  };

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
        return 'top-full right-0 mt-1.5';
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={handleQuickPress}
        className={`rounded-lg transition flex items-center gap-1.5 font-medium ${btnPaddings[size]} ${
          isAdded
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            : 'text-zinc-500 hover:text-brand-600 dark:hover:text-brand-300 hover:bg-brand-500/10 active:scale-95'
        }`}
        title="Add directly to Calendar (Apple Calendar / Google Calendar)"
        aria-label="Add to Calendar"
      >
        {isAdded ? (
          <Check className={`${iconSizes[size]} text-emerald-500`} />
        ) : (
          <CalendarPlus className={`${iconSizes[size]}`} />
        )}
        {showLabel && (
          <span>{isAdded ? 'Added' : 'Add to Calendar'}</span>
        )}
      </button>

      {/* Desktop Calendar Destination Menu */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute z-50 min-w-[200px] p-1.5 rounded-xl shadow-xl border text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 animate-in fade-in zoom-in-95 duration-100 ${getPopoverPositionClasses()}`}
        >
          <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold border-b border-zinc-100 dark:border-zinc-800 mb-1">
            Add to Calendar
          </div>

          <button
            type="button"
            onClick={handleGoogleCalendar}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between gap-2 transition group"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-medium text-xs">Google Calendar</span>
            </span>
            <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
          </button>

          <button
            type="button"
            onClick={handleAppleOrOutlook}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between gap-2 transition group"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              <span className="font-medium text-xs">Apple / Outlook (.ics)</span>
            </span>
            <Download className="w-3 h-3 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
          </button>
        </div>
      )}
    </div>
  );
};
