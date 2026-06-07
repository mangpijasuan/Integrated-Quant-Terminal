"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthToken } from "./api";

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

export function invalidateApiCache(key: string): void {
  memoryCache.delete(key);
}

export async function fetchCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 30_000
): Promise<T> {
  const cached = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (cached && Date.now() - cached.fetchedAt < ttlMs) {
    return cached.data;
  }

  const data = await fetcher();
  memoryCache.set(key, { data, fetchedAt: Date.now() });
  return data;
}

interface UseApiCacheOptions {
  refreshInterval?: number;
  ttlMs?: number;
}

export function useApiCache<T>(
  key: string,
  url: string,
  options: UseApiCacheOptions = {}
) {
  const { refreshInterval, ttlMs = 30_000 } = options;
  const [data, setData] = useState<T | null>(() => {
    const cached = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.fetchedAt < ttlMs) return cached.data;
    return null;
  });
  const [loading, setLoading] = useState(data === null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(
    async (background = false) => {
      if (!background) setLoading(true);
      else setRefreshing(true);

      try {
        const token = getAuthToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`Failed to fetch ${url}`);

        const json = (await res.json()) as T;
        memoryCache.set(key, { data: json, fetchedAt: Date.now() });
        setData(json);
      } catch {
        if (!background) setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [key, url]
  );

  const reload = useCallback(
    (background = false) => {
      invalidateApiCache(key);
      return fetchData(background);
    },
    [key, fetchData]
  );

  useEffect(() => {
    const cached = memoryCache.get(key) as CacheEntry<T> | undefined;
    const hasFreshCache = cached && Date.now() - cached.fetchedAt < ttlMs;
    fetchData(Boolean(hasFreshCache));

    if (!refreshInterval) return undefined;

    const id = setInterval(() => fetchData(true), refreshInterval);
    return () => clearInterval(id);
  }, [key, url, refreshInterval, ttlMs, fetchData]);

  return { data, loading, refreshing, reload };
}
