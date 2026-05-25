import type { AccountState } from './types';
import type { Locale } from './i18n';

export const EMPTY_ACCOUNT: AccountState = {
  user: null,
  credits: 0,
  plan: 'free',
  loading: true,
};

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'API_ERROR');
  }
  return data as T;
}

export async function fetchAccount(): Promise<AccountState> {
  const data = await apiFetch<{ user: AccountState['user']; credits: number; plan?: AccountState['plan'] }>('/api/me');
  return {
    user: data.user,
    credits: data.credits,
    plan: data.plan ?? 'free',
    loading: false,
  };
}

export async function startMagicLink(email: string, locale: Locale = 'de'): Promise<{ sent: boolean; devLink?: string }> {
  return apiFetch('/api/auth/start', {
    method: 'POST',
    body: JSON.stringify({ email, locale }),
  });
}

export async function logoutAccount(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
}

export async function startCheckout(locale: Locale = 'de'): Promise<{ url: string }> {
  return apiFetch('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ locale }),
  });
}
