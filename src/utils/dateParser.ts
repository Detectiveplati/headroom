/**
 * Zero-dependency Natural Language Date & Time Parser
 * Extracts dates, relative days, weekdays, and times from raw task titles.
 * Returns a cleaned title, computed ISO dueDate, hasSpecificTime flag, and human-friendly display label.
 */

export interface ParsedDateResult {
  hasMatch: boolean;
  cleanTitle: string;
  dueDate: string | null; // ISO 8601 string: YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DD
  hasSpecificTime: boolean;
  matchedText?: string;
  formattedPreview?: string;
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const DAY_OF_WEEK_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

/**
 * Parse a task title string for date and time patterns.
 * Example inputs:
 *  - "exercise next tuesday"
 *  - "exercise next tuesday at 3pm"
 *  - "call mom tomorrow 10:30am"
 *  - "team sync in 3 days at 14:00"
 *  - "dentist on oct 24th at 2pm"
 */
export function parseNaturalLanguageDate(input: string, referenceDate: Date = new Date()): ParsedDateResult {
  if (!input || typeof input !== 'string' || !input.trim()) {
    return {
      hasMatch: false,
      cleanTitle: input || '',
      dueDate: null,
      hasSpecificTime: false,
    };
  }

  const workingText = input.trim();
  let cleanTitle = workingText;
  let targetDate = new Date(referenceDate.getTime());
  let dateMatched = false;
  let timeMatched = false;
  const matchedTokens: string[] = [];

  // ================= 1. TIME MATCHING =================
  // Patterns:
  // - "at 3pm", "at 3:30pm", "at 3:30 pm"
  // - "3pm", "3:30pm", "3.30pm"
  // - "at 15:00", "15:00"
  // - "at noon", "noon", "at midnight", "midnight"
  const timeRegex = /\b(?:at\s+)?(?:(?<hour>\d{1,2})(?::(?<minute>\d{2}))?\s*(?<meridian>am|pm)|(?<h24>\d{1,2}):(?<m24>\d{2})|(?<named>noon|midnight))\b/i;
  const timeMatch = cleanTitle.match(timeRegex);

  let targetHour = 0;
  let targetMinute = 0;

  if (timeMatch && timeMatch.index !== undefined) {
    const { hour, minute, meridian, h24, m24, named } = timeMatch.groups || {};

    if (named) {
      timeMatched = true;
      if (named.toLowerCase() === 'noon') {
        targetHour = 12;
        targetMinute = 0;
      } else {
        targetHour = 0;
        targetMinute = 0;
      }
    } else if (h24 && m24) {
      const h = parseInt(h24, 10);
      const m = parseInt(m24, 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        timeMatched = true;
        targetHour = h;
        targetMinute = m;
      }
    } else if (hour) {
      let h = parseInt(hour, 10);
      const m = minute ? parseInt(minute, 10) : 0;
      const mer = meridian?.toLowerCase();

      if (h >= 1 && h <= 12 && m >= 0 && m <= 59 && mer) {
        timeMatched = true;
        if (mer === 'pm' && h < 12) h += 12;
        if (mer === 'am' && h === 12) h = 0;
        targetHour = h;
        targetMinute = m;
      }
    }

    if (timeMatched) {
      matchedTokens.push(timeMatch[0]);
      // Remove time from cleanTitle
      cleanTitle = cleanTitle.replace(timeMatch[0], ' ');
    }
  }

  // ================= 2. DATE MATCHING =================

  // 2A. Relative Today / Tomorrow / Tonight
  const relativeDayRegex = /\b(?:on\s+)?(?<rel>today|tomorrow|tonight)\b/i;
  const relMatch = cleanTitle.match(relativeDayRegex);

  if (relMatch) {
    dateMatched = true;
    const relWord = relMatch.groups?.rel.toLowerCase();
    matchedTokens.push(relMatch[0]);
    cleanTitle = cleanTitle.replace(relMatch[0], ' ');

    if (relWord === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (relWord === 'tonight') {
      // If time wasn't explicitly given, default tonight to 8:00 PM
      if (!timeMatched) {
        timeMatched = true;
        targetHour = 20;
        targetMinute = 0;
      }
    }
  }

  // 2B. Days of the week: "next tuesday", "this friday", "on wednesday", "coming sunday", "friday"
  if (!dateMatched) {
    const weekdayRegex = /\b(?:on\s+)?(?:(?<modifier>next|this|coming)\s+)?(?<weekday>monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/i;
    const weekdayMatch = cleanTitle.match(weekdayRegex);

    if (weekdayMatch) {
      const { modifier, weekday } = weekdayMatch.groups || {};
      const targetDay = DAY_OF_WEEK_MAP[weekday.toLowerCase()];

      if (targetDay !== undefined) {
        dateMatched = true;
        matchedTokens.push(weekdayMatch[0]);
        cleanTitle = cleanTitle.replace(weekdayMatch[0], ' ');

        const currentDay = referenceDate.getDay();
        let diff = targetDay - currentDay;

        const mod = modifier?.toLowerCase();
        if (mod === 'next') {
          // "next Tuesday": if today is Tuesday, jump 7 days; otherwise jump to next week's occurrence
          if (diff <= 0) {
            diff += 7;
          } else {
            diff += 7;
          }
        } else {
          // "this Tuesday", "coming Tuesday", or "on Tuesday": jump to next immediate occurrence
          if (diff <= 0) {
            diff += 7;
          }
        }

        targetDate.setDate(targetDate.getDate() + diff);
      }
    }
  }

  // 2C. In X days / In X weeks: "in 3 days", "in 1 week", "in 2 days"
  if (!dateMatched) {
    const offsetRegex = /\bin\s+(?<count>\d+)\s+(?<unit>day|days|week|weeks)\b/i;
    const offsetMatch = cleanTitle.match(offsetRegex);

    if (offsetMatch) {
      const count = parseInt(offsetMatch.groups?.count || '0', 10);
      const unit = offsetMatch.groups?.unit?.toLowerCase();

      if (count > 0) {
        dateMatched = true;
        matchedTokens.push(offsetMatch[0]);
        cleanTitle = cleanTitle.replace(offsetMatch[0], ' ');

        const daysToAdd = unit && unit.startsWith('week') ? count * 7 : count;
        targetDate.setDate(targetDate.getDate() + daysToAdd);
      }
    }
  }

  // 2D. Specific Month & Day: "oct 25", "25th oct", "october 25th", "on oct 25"
  if (!dateMatched) {
    const monthDayRegex = /\b(?:on\s+)?(?:(?<mName>jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(?<day1>\d{1,2})(?:st|nd|rd|th)?|(?<day2>\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(?<mName2>jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december))\b/i;
    const monthMatch = cleanTitle.match(monthDayRegex);

    if (monthMatch) {
      const mName = (monthMatch.groups?.mName || monthMatch.groups?.mName2)?.toLowerCase();
      const dNum = parseInt(monthMatch.groups?.day1 || monthMatch.groups?.day2 || '0', 10);

      if (mName && dNum >= 1 && dNum <= 31 && MONTH_MAP[mName] !== undefined) {
        dateMatched = true;
        matchedTokens.push(monthMatch[0]);
        cleanTitle = cleanTitle.replace(monthMatch[0], ' ');

        const monthIdx = MONTH_MAP[mName];
        targetDate.setMonth(monthIdx, dNum);

        // If target date in current year is already past, roll over to next year
        if (targetDate.getTime() < referenceDate.getTime() - 86400000) {
          targetDate.setFullYear(targetDate.getFullYear() + 1);
        }
      }
    }
  }

  // If only a time was matched without a date (e.g. "team sync 3pm"), default date to today or tomorrow
  if (timeMatched && !dateMatched) {
    dateMatched = true;
    // If the time has already passed today, default to tomorrow
    const currentHour = referenceDate.getHours();
    const currentMin = referenceDate.getMinutes();
    if (targetHour < currentHour || (targetHour === currentHour && targetMinute <= currentMin)) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
  }

  if (!dateMatched && !timeMatched) {
    return {
      hasMatch: false,
      cleanTitle: workingText,
      dueDate: null,
      hasSpecificTime: false,
    };
  }

  // Set time components
  if (timeMatched) {
    targetDate.setHours(targetHour, targetMinute, 0, 0);
  } else {
    // All-day: set to noon or start of day
    targetDate.setHours(9, 0, 0, 0);
  }

  // Clean title punctuation & redundant whitespace
  cleanTitle = cleanTitle
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '')
    .trim();

  // If stripping the date left the title completely empty, keep original
  if (!cleanTitle) {
    cleanTitle = workingText;
  }

  // Format human-friendly preview
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };

  const datePart = targetDate.toLocaleDateString(undefined, options);
  let formattedPreview = datePart;

  if (timeMatched) {
    const timePart = targetDate.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: targetMinute === 0 ? undefined : '2-digit',
    });
    formattedPreview = `${datePart} • ${timePart}`;
  } else {
    formattedPreview = `${datePart} (All day)`;
  }

  return {
    hasMatch: true,
    cleanTitle,
    dueDate: targetDate.toISOString(),
    hasSpecificTime: timeMatched,
    matchedText: matchedTokens.join(' ').trim(),
    formattedPreview,
  };
}
