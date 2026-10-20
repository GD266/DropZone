import type { RecentShare } from '../types';

const STORAGE_KEY = 'dropzone_recent_shares_v1';
const CHANGE_EVENT = 'dropzone:recent-shares-changed';
const MAX_RECENT_SHARES = 8;

function isRecentShare(value: unknown): value is RecentShare {
  if (!value || typeof value !== 'object') return false;
  const share = value as Partial<RecentShare>;
  return (
    typeof share.shareId === 'string' &&
    typeof share.createdAt === 'string' &&
    typeof share.fileCount === 'number' &&
    typeof share.totalSize === 'number' &&
    Array.isArray(share.fileNames) &&
    (share.mode === 'cloud' || share.mode === 'local')
  );
}

export function getRecentShares(): RecentShare[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentShare).slice(0, MAX_RECENT_SHARES);
  } catch {
    return [];
  }
}

function saveRecentShares(shares: RecentShare[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shares.slice(0, MAX_RECENT_SHARES)));
  } catch {
    // Local history is a convenience; storage privacy mode should not break uploads.
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
  window.dispatchEvent(new Event('storage'));
}

export function recordRecentShare(share: RecentShare): void {
  const existing = getRecentShares().filter(item => item.shareId !== share.shareId);
  saveRecentShares([share, ...existing]);
}

export function removeRecentShare(shareId: string): void {
  saveRecentShares(getRecentShares().filter(item => item.shareId !== shareId));
}

export function clearRecentShares(): void {
  saveRecentShares([]);
}

export function subscribeToRecentShares(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) callback();
  };

  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', handleStorage);
  };
}
