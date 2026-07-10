import { useCallback, useEffect, useState } from 'react';

const CACHE_PREFIX = 'appCache:';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

interface CacheEnvelope<T> {
  data: T;
  cachedAt: number;
}

function readCache<T>(storageKey: string): CacheEnvelope<T> | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEnvelope<T>;
  } catch {
    return null;
  }
}

function writeCache<T>(storageKey: string, data: T) {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ data, cachedAt: Date.now() } as CacheEnvelope<T>));
  } catch {
    // localStorage full/unavailable — caching is best-effort, ignore
  }
}

function isFresh<T>(cached: CacheEnvelope<T> | null, ttlMs: number): boolean {
  return !!cached && Date.now() - cached.cachedAt < ttlMs;
}

/**
 * Reads `key` from localStorage synchronously on first render, so a fresh
 * copy (< ttlMs old) paints instantly with no fetch. Otherwise calls
 * `fetcher` and caches the result for next time. Call `refresh()` to force
 * a re-fetch (e.g. from a "Refresh" button), and `setData()` after local
 * mutations so the cache doesn't go stale before ttlMs is up.
 */
export function useLocalCache<T>(key: string, fetcher: () => Promise<T>, ttlMs: number = DEFAULT_TTL_MS) {
  const storageKey = CACHE_PREFIX + key;

  const [data, setDataState] = useState<T | null>(() => {
    const cached = readCache<T>(storageKey);
    return isFresh(cached, ttlMs) ? (cached as CacheEnvelope<T>).data : null;
  });
  const [loading, setLoading] = useState<boolean>(() => !isFresh(readCache<T>(storageKey), ttlMs));

  useEffect(() => {
    if (isFresh(readCache<T>(storageKey), ttlMs)) return;
    let cancelled = false;
    fetcher().then(fresh => {
      if (cancelled) return;
      writeCache(storageKey, fresh);
      setDataState(fresh);
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetcher().then(fresh => {
      writeCache(storageKey, fresh);
      setDataState(fresh);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // The updater form assumes data has already loaded (true whenever a caller
  // is reacting to a user action on already-rendered data).
  const setData = useCallback((value: T | ((prev: T) => T)) => {
    setDataState(prev => {
      const next = typeof value === 'function' ? (value as (prev: T) => T)(prev as T) : value;
      writeCache(storageKey, next);
      return next;
    });
  }, [storageKey]);

  return { data, loading, refresh, setData };
}
