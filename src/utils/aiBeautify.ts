import { BeautifyTitleRequest, BeautifyTitleResponse } from '../types';

// In-memory cache to guarantee zero redundant network/token calls for the same title
const titleCache = new Map<string, string>();

export interface BeautifyResult {
  suggestedTitle: string;
  fromCache: boolean;
}

/**
 * Fetch a beautified, concise task title from the backend Gemini endpoint.
 * Memoized with an in-memory cache to minimize token usage.
 */
export async function fetchBeautifiedTitle(
  title: string,
  signal?: AbortSignal
): Promise<BeautifyResult> {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error('Title cannot be empty');
  }

  const cacheKey = trimmed.toLowerCase();
  if (titleCache.has(cacheKey)) {
    return {
      suggestedTitle: titleCache.get(cacheKey)!,
      fromCache: true,
    };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Offline: AI beautify requires an active connection.');
  }

  const payload: BeautifyTitleRequest = { title: trimmed };

  const response = await fetch('/api/tasks/beautify-title', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  const data: BeautifyTitleResponse = await response.json();

  if (!response.ok || !data.success || !data.suggestedTitle) {
    throw new Error(data.error || 'Failed to beautify title');
  }

  const result = data.suggestedTitle.trim();
  titleCache.set(cacheKey, result);

  return {
    suggestedTitle: result,
    fromCache: false,
  };
}

/**
 * Check if a title has already been cached in memory.
 */
export function getCachedTitle(title: string): string | undefined {
  return titleCache.get(title.trim().toLowerCase());
}
