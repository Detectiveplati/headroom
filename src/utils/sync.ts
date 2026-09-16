import { Task, AppSettings } from '../types';
import { getStoredAuthToken } from './auth';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

const STORAGE_KEY_BOARD_KEY = 'headroom_board_key_v1';
const STORAGE_KEY_LAST_SYNCED = 'headroom_last_synced_v1';

export interface RemoteBoardData {
  tasks: Task[];
  settings?: AppSettings;
  activeTaskId?: string | null;
  updatedAt: number;
}

export interface SyncResult {
  success: boolean;
  status: SyncStatus;
  message?: string;
  data?: RemoteBoardData | null;
  conflict?: boolean;
}

export function getStoredBoardKey(): string {
  try {
    return (localStorage.getItem(STORAGE_KEY_BOARD_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function saveStoredBoardKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_BOARD_KEY, key.trim());
  } catch (e) {
    console.error('Failed to save board key', e);
  }
}

export function getStoredLastSynced(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_SYNCED);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredLastSynced(timestamp: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_LAST_SYNCED, timestamp.toString());
  } catch (e) {
    console.error('Failed to save last synced time', e);
  }
}

/**
 * Fetch board state from the cloud API
 */
export async function pullBoardFromCloud(boardKey: string = ''): Promise<SyncResult> {
  try {
    const targetKey = encodeURIComponent(boardKey || '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const token = getStoredAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api/board?key=${targetKey}`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return { success: false, status: 'error', message: `Server error HTTP ${res.status}` };
    }

    const body = await res.json();
    if (body.found && body.data) {
      saveStoredLastSynced(Date.now());
      return {
        success: true,
        status: 'synced',
        data: body.data,
      };
    }

    return {
      success: true,
      status: 'synced',
      data: null, // First time board (not yet stored in cloud)
    };
  } catch (err: unknown) {
    const isOffline = (err as Error).name === 'AbortError' || !navigator.onLine;
    return {
      success: false,
      status: isOffline ? 'offline' : 'error',
      message: (err as Error).message || 'Failed to connect to sync server',
    };
  }
}

/**
 * Push local board state to the cloud API
 */
export async function pushBoardToCloud(
  boardKey: string = 'default',
  payload: {
    tasks: Task[];
    settings: AppSettings;
    activeTaskId: string | null;
    updatedAt: number;
    force?: boolean;
  }
): Promise<SyncResult> {
  try {
    const targetKey = encodeURIComponent(boardKey || 'default');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const token = getStoredAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api/board?key=${targetKey}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status === 409) {
      const conflictBody = await res.json();
      return {
        success: false,
        status: 'error',
        conflict: true,
        message: 'Server has newer updates from another device',
        data: conflictBody.serverBoard,
      };
    }

    if (!res.ok) {
      return { success: false, status: 'error', message: `Server error HTTP ${res.status}` };
    }

    const body = await res.json();
    saveStoredLastSynced(Date.now());
    return {
      success: true,
      status: 'synced',
      data: body.data,
    };
  } catch (err: unknown) {
    const isOffline = (err as Error).name === 'AbortError' || !navigator.onLine;
    return {
      success: false,
      status: isOffline ? 'offline' : 'error',
      message: (err as Error).message || 'Failed to connect to sync server',
    };
  }
}
