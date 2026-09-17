import { BeautifyTitleRequest, BeautifyTitleResponse } from '../types';

// In-memory cache to guarantee zero redundant network/token calls for the same title
const titleCache = new Map<string, string>();

export const GEMINI_API_KEY_STORAGE_KEY = 'headroom_gemini_api_key';

export function getStoredGeminiApiKey(): string {
  try {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredGeminiApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    }
  } catch {
    // Storage quota or private mode safe fallback
  }
}

/**
 * Intelligent zero-failure local heuristic title cleaner.
 * Strips conversational filler, anxiety-inducing prefixes, and clutter.
 * 100% offline, 0ms latency, zero API costs.
 */
export function cleanTitleLocally(rawTitle: string): string {
  if (!rawTitle || typeof rawTitle !== 'string') return '';
  let text = rawTitle.trim();

  // Strip leading conversational and anxiety filler prefixes (case-insensitive)
  const fillerPrefixes = [
    /^(?:hey\s+)?(?:please\s+)?(?:can\s+you\s+)?(?:could\s+you\s+)?(?:remember\s+to\s+|don'?t\s+forget\s+to\s+)/i,
    /^(?:i\s+)?(?:need\s+to|have\s+to|got\s+to|must|should|ought\s+to)\s+/i,
    /^(?:make\s+sure\s+to|be\s+sure\s+to)\s+/i,
    /^(?:try\s+to|start\s+to|plan\s+to|going\s+to|want\s+to)\s+/i,
    /^(?:take\s+time\s+to|schedule\s+time\s+to|find\s+time\s+to)\s+/i,
    /^(?:task:\s*|todo:\s*|action:\s*)/i,
  ];

  for (const regex of fillerPrefixes) {
    text = text.replace(regex, '');
  }

  // Strip trailing conversational clutter or punctuation
  text = text.replace(/\s+(?:asap|when\s+you\s+can|when\s+possible|if\s+possible|please)\b/gi, '');
  text = text.replace(/[.!?]+$/g, '').trim();

  // Capitalize leading character
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return text || rawTitle.trim();
}

export interface BeautifyResult {
  suggestedTitle: string;
  fromCache: boolean;
  isLocalFallback?: boolean;
}

/**
 * Fetch a beautified, concise task title from the backend Gemini endpoint,
 * with a zero-failure local heuristic fallback if API key is unconfigured or offline.
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
      isLocalFallback: false,
    };
  }

  // Try backend Gemini call if online
  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      const userApiKey = getStoredGeminiApiKey();
      const payload: BeautifyTitleRequest = { 
        title: trimmed,
        apiKey: userApiKey || undefined,
      };

      const response = await fetch('/api/tasks/beautify-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      });

      const data: BeautifyTitleResponse = await response.json();

      if (response.ok && data.success && data.suggestedTitle) {
        const result = data.suggestedTitle.trim();
        titleCache.set(cacheKey, result);
        return {
          suggestedTitle: result,
          fromCache: false,
          isLocalFallback: false,
        };
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err; // Re-throw intentional abort
      }
      // Silently fall back to smart local heuristic cleaner
    }
  }

  // Zero-failure fallback: Smart local heuristic summarizer
  const localResult = cleanTitleLocally(trimmed);
  titleCache.set(cacheKey, localResult);

  return {
    suggestedTitle: localResult,
    fromCache: false,
    isLocalFallback: true,
  };
}

/**
 * Check if a title has already been cached in memory.
 */
export function getCachedTitle(title: string): string | undefined {
  return titleCache.get(title.trim().toLowerCase());
}
