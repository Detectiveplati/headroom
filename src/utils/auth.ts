import { User } from '../types';

const STORAGE_KEY_AUTH_TOKEN = 'headroom_auth_token_v1';

export function getStoredAuthToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
  } catch {
    return null;
  }
}

export function saveStoredAuthToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUTH_TOKEN, token);
  } catch (e) {
    console.error('Failed to save auth token', e);
  }
}

export function clearStoredAuthToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
  } catch (e) {
    console.error('Failed to clear auth token', e);
  }
}

export async function registerApi(username: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Registration failed');
  }

  saveStoredAuthToken(data.token);
  return { user: data.user, token: data.token };
}

export async function loginApi(username: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Login failed');
  }

  saveStoredAuthToken(data.token);
  return { user: data.user, token: data.token };
}

export async function getMeApi(): Promise<User | null> {
  const token = getStoredAuthToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      clearStoredAuthToken();
      return null;
    }

    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export async function logoutApi(): Promise<void> {
  const token = getStoredAuthToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Ignore network errors on logout
    }
  }
  clearStoredAuthToken();
}
