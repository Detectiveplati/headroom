import { TaskColor } from '../types';

export interface ColorThemeConfig {
  id: TaskColor;
  label: string;
  dotClass: string;
  borderLeftClass: string;
  bgClass: string;
  borderClass: string;
  badgeBg: string;
  badgeText: string;
  groupHeaderClass: string;
  hudAccentClass: string;
}

export const TASK_COLORS: Record<TaskColor, ColorThemeConfig> = {
  default: {
    id: 'default',
    label: 'Neutral',
    dotClass: 'bg-zinc-400 dark:bg-zinc-500',
    borderLeftClass: '',
    bgClass: 'bg-offwhite-card dark:bg-[#151821]/80 hover:bg-offwhite-card dark:hover:bg-[#1a1e2a]',
    borderClass: 'border-zinc-300/70 dark:border-zinc-800/80 hover:border-zinc-400/90 dark:hover:border-zinc-700',
    badgeBg: 'bg-zinc-100 dark:bg-zinc-800',
    badgeText: 'text-zinc-600 dark:text-zinc-400',
    groupHeaderClass: 'bg-zinc-100/70 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300',
    hudAccentClass: 'bg-brand-500',
  },
  red: {
    id: 'red',
    label: 'Crimson',
    dotClass: 'bg-red-500',
    borderLeftClass: 'border-l-4 border-l-red-500',
    bgClass: 'bg-red-500/[0.04] dark:bg-red-950/20 hover:bg-red-500/[0.07] dark:hover:bg-red-950/30',
    borderClass: 'border-red-300/70 dark:border-red-900/50 hover:border-red-400 dark:hover:border-red-800',
    badgeBg: 'bg-red-500/10',
    badgeText: 'text-red-700 dark:text-red-300',
    groupHeaderClass: 'bg-red-500/10 dark:bg-red-950/40 border-red-300/60 dark:border-red-900/40 text-red-700 dark:text-red-300',
    hudAccentClass: 'bg-red-500',
  },
  amber: {
    id: 'amber',
    label: 'Amber',
    dotClass: 'bg-amber-500',
    borderLeftClass: 'border-l-4 border-l-amber-500',
    bgClass: 'bg-amber-500/[0.04] dark:bg-amber-950/20 hover:bg-amber-500/[0.07] dark:hover:bg-amber-950/30',
    borderClass: 'border-amber-300/70 dark:border-amber-900/50 hover:border-amber-400 dark:hover:border-amber-800',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-700 dark:text-amber-300',
    groupHeaderClass: 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-300/60 dark:border-amber-900/40 text-amber-700 dark:text-amber-300',
    hudAccentClass: 'bg-amber-500',
  },
  emerald: {
    id: 'emerald',
    label: 'Emerald',
    dotClass: 'bg-emerald-500',
    borderLeftClass: 'border-l-4 border-l-emerald-500',
    bgClass: 'bg-emerald-500/[0.04] dark:bg-emerald-950/20 hover:bg-emerald-500/[0.07] dark:hover:bg-emerald-950/30',
    borderClass: 'border-emerald-300/70 dark:border-emerald-900/50 hover:border-emerald-400 dark:hover:border-emerald-800',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    groupHeaderClass: 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-300/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    hudAccentClass: 'bg-emerald-500',
  },
  teal: {
    id: 'teal',
    label: 'Teal',
    dotClass: 'bg-teal-500',
    borderLeftClass: 'border-l-4 border-l-teal-500',
    bgClass: 'bg-teal-500/[0.04] dark:bg-teal-950/20 hover:bg-teal-500/[0.07] dark:hover:bg-teal-950/30',
    borderClass: 'border-teal-300/70 dark:border-teal-900/50 hover:border-teal-400 dark:hover:border-teal-800',
    badgeBg: 'bg-teal-500/10',
    badgeText: 'text-teal-700 dark:text-teal-300',
    groupHeaderClass: 'bg-teal-500/10 dark:bg-teal-950/40 border-teal-300/60 dark:border-teal-900/40 text-teal-700 dark:text-teal-300',
    hudAccentClass: 'bg-teal-500',
  },
  blue: {
    id: 'blue',
    label: 'Sky Blue',
    dotClass: 'bg-blue-500',
    borderLeftClass: 'border-l-4 border-l-blue-500',
    bgClass: 'bg-blue-500/[0.04] dark:bg-blue-950/20 hover:bg-blue-500/[0.07] dark:hover:bg-blue-950/30',
    borderClass: 'border-blue-300/70 dark:border-blue-900/50 hover:border-blue-400 dark:hover:border-blue-800',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-700 dark:text-blue-300',
    groupHeaderClass: 'bg-blue-500/10 dark:bg-blue-950/40 border-blue-300/60 dark:border-blue-900/40 text-blue-700 dark:text-blue-300',
    hudAccentClass: 'bg-blue-500',
  },
  indigo: {
    id: 'indigo',
    label: 'Indigo',
    dotClass: 'bg-indigo-500',
    borderLeftClass: 'border-l-4 border-l-indigo-500',
    bgClass: 'bg-indigo-500/[0.04] dark:bg-indigo-950/20 hover:bg-indigo-500/[0.07] dark:hover:bg-indigo-950/30',
    borderClass: 'border-indigo-300/70 dark:border-indigo-900/50 hover:border-indigo-400 dark:hover:border-indigo-800',
    badgeBg: 'bg-indigo-500/10',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    groupHeaderClass: 'bg-indigo-500/10 dark:bg-indigo-950/40 border-indigo-300/60 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-300',
    hudAccentClass: 'bg-indigo-500',
  },
  purple: {
    id: 'purple',
    label: 'Violet',
    dotClass: 'bg-purple-500',
    borderLeftClass: 'border-l-4 border-l-purple-500',
    bgClass: 'bg-purple-500/[0.04] dark:bg-purple-950/20 hover:bg-purple-500/[0.07] dark:hover:bg-purple-950/30',
    borderClass: 'border-purple-300/70 dark:border-purple-900/50 hover:border-purple-400 dark:hover:border-purple-800',
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-700 dark:text-purple-300',
    groupHeaderClass: 'bg-purple-500/10 dark:bg-purple-950/40 border-purple-300/60 dark:border-purple-900/40 text-purple-700 dark:text-purple-300',
    hudAccentClass: 'bg-purple-500',
  },
  pink: {
    id: 'pink',
    label: 'Rose',
    dotClass: 'bg-pink-500',
    borderLeftClass: 'border-l-4 border-l-pink-500',
    bgClass: 'bg-pink-500/[0.04] dark:bg-pink-950/20 hover:bg-pink-500/[0.07] dark:hover:bg-pink-950/30',
    borderClass: 'border-pink-300/70 dark:border-pink-900/50 hover:border-pink-400 dark:hover:border-pink-800',
    badgeBg: 'bg-pink-500/10',
    badgeText: 'text-pink-700 dark:text-pink-300',
    groupHeaderClass: 'bg-pink-500/10 dark:bg-pink-950/40 border-pink-300/60 dark:border-pink-900/40 text-pink-700 dark:text-pink-300',
    hudAccentClass: 'bg-pink-500',
  },
};

export const TASK_COLOR_LIST: TaskColor[] = [
  'default',
  'red',
  'amber',
  'emerald',
  'teal',
  'blue',
  'indigo',
  'purple',
  'pink',
];

export function getTaskColorConfig(color?: TaskColor): ColorThemeConfig {
  if (!color || !TASK_COLORS[color]) {
    return TASK_COLORS.default;
  }
  return TASK_COLORS[color];
}
