import { Task } from '../types';

/**
 * Format a Date object to RFC 5545 UTC timestamp: YYYYMMDDTHHmmssZ
 */
function formatUtcTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Format a Date object to all-day date: YYYYMMDD
 */
function formatAllDayDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Generate standard RFC 5545 iCalendar (.ics) content.
 * Compatible with Apple Calendar (iOS/macOS), Outlook, and Google Calendar.
 */
export function generateIcsContent(task: Task, durationMinutes: number = 30): string {
  const now = new Date();
  const dtStamp = formatUtcTimestamp(now);

  const startDate = task.dueDate ? new Date(task.dueDate) : new Date();
  const isAllDay = !task.hasSpecificTime;

  let dateLines = '';
  if (isAllDay) {
    const nextDay = new Date(startDate.getTime());
    nextDay.setDate(nextDay.getDate() + 1);
    dateLines = [
      `DTSTART;VALUE=DATE:${formatAllDayDate(startDate)}`,
      `DTEND;VALUE=DATE:${formatAllDayDate(nextDay)}`,
    ].join('\r\n');
  } else {
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    dateLines = [
      `DTSTART:${formatUtcTimestamp(startDate)}`,
      `DTEND:${formatUtcTimestamp(endDate)}`,
    ].join('\r\n');
  }

  // Clean description & title for ICS escaping
  const cleanTitle = (task.title || 'Headroom Task')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');

  const cleanDescription = (task.description || `Created with Headroom • Priority: ${task.priority}`)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');

  const uid = `${task.id.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}@headroom.app`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Headroom//Task Engine//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    dateLines,
    `SUMMARY:${cleanTitle}`,
    `DESCRIPTION:${cleanDescription}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Generate Google Calendar event URL for instant Android or web prefilled creation.
 */
export function generateGoogleCalendarUrl(task: Task, durationMinutes: number = 30): string {
  const startDate = task.dueDate ? new Date(task.dueDate) : new Date();
  const isAllDay = !task.hasSpecificTime;

  let datesParam = '';
  if (isAllDay) {
    const nextDay = new Date(startDate.getTime());
    nextDay.setDate(nextDay.getDate() + 1);
    datesParam = `${formatAllDayDate(startDate)}/${formatAllDayDate(nextDay)}`;
  } else {
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    datesParam = `${formatUtcTimestamp(startDate)}/${formatUtcTimestamp(endDate)}`;
  }

  const title = encodeURIComponent(task.title || 'Headroom Task');
  const details = encodeURIComponent(
    task.description
      ? `${task.description}\n\n[Headroom Kanban]`
      : `Managed in Headroom • Priority: ${task.priority}`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}`;
}

/**
 * Trigger download of .ics file (works on macOS Apple Calendar, Windows Outlook, Safari fallback).
 */
export function downloadIcsFile(task: Task, durationMinutes: number = 30): void {
  const ics = generateIcsContent(task, durationMinutes);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${(task.title || 'task').slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Detect client operating environment.
 */
export function getClientDevice(): 'ios' | 'android' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

/**
 * Universal 1-Click "Add to Calendar" function.
 * Smart-routes based on OS:
 * - iOS: Web Share API with .ics file (opens native iOS "Add to Calendar" sheet)
 * - Android: Google Calendar deep link (opens native Google Calendar app)
 * - Desktop: Opens Google Calendar URL or downloads .ics
 */
export async function addToNativeCalendar(
  task: Task,
  durationMinutes: number = 30
): Promise<{ method: 'share' | 'download' | 'google_url'; success: boolean }> {
  const device = getClientDevice();

  // 1. iOS: Web Share API with .ics File
  if (device === 'ios') {
    try {
      const ics = generateIcsContent(task, durationMinutes);
      const file = new File([ics], 'event.ics', { type: 'text/calendar' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: task.title,
        });
        return { method: 'share', success: true };
      }
    } catch (err: unknown) {
      // If user cancelled share sheet, return silently
      if (err instanceof Error && err.name === 'AbortError') {
        return { method: 'share', success: false };
      }
    }

    // Fallback if canShare fails
    downloadIcsFile(task, durationMinutes);
    return { method: 'download', success: true };
  }

  // 2. Android: Google Calendar Deep Link
  if (device === 'android') {
    const url = generateGoogleCalendarUrl(task, durationMinutes);
    window.open(url, '_blank');
    return { method: 'google_url', success: true };
  }

  // 3. Desktop Default: Open Google Calendar in new tab (or caller can present modal)
  const url = generateGoogleCalendarUrl(task, durationMinutes);
  window.open(url, '_blank');
  return { method: 'google_url', success: true };
}
