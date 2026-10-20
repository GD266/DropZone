import { useCallback, useEffect, useState } from 'react';
import type { RecentShare } from '../types';
import {
  clearRecentShares,
  getRecentShares,
  removeRecentShare,
  subscribeToRecentShares,
} from '../lib/recentShares';

export function useRecentShares() {
  const [recentShares, setRecentShares] = useState<RecentShare[]>(() => getRecentShares());

  const refresh = useCallback(() => {
    setRecentShares(getRecentShares());
  }, []);

  useEffect(() => subscribeToRecentShares(refresh), [refresh]);

  const remove = useCallback((shareId: string) => {
    removeRecentShare(shareId);
    setRecentShares(getRecentShares());
  }, []);

  const clear = useCallback(() => {
    clearRecentShares();
    setRecentShares([]);
  }, []);

  return { recentShares, remove, clear, refresh };
}
