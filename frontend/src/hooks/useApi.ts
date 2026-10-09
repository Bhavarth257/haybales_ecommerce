'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

interface State<T> {
  path: string | null;
  data: T | null;
  error: string | null;
}

/** GET `path` (skip when null). Returns data/error/loading and reload(). */
export function useApi<T>(path: string | null, opts: { auth?: boolean } = {}) {
  const { auth } = opts;
  const [state, setState] = useState<State<T>>({ path: null, data: null, error: null });
  const [reloading, setReloading] = useState(false);
  const latest = useRef(path);

  // State is only set after the await, and responses for an old path are dropped.
  const fetchNow = useCallback(async () => {
    if (!path) return;
    try {
      const data = await api<T>(path, { auth });
      if (latest.current === path) setState({ path, data, error: null });
    } catch (e) {
      if (latest.current === path) setState((s) => ({ path, data: s.path === path ? s.data : null, error: (e as Error).message }));
    }
  }, [path, auth]);

  useEffect(() => {
    latest.current = path;
    void fetchNow();
  }, [path, fetchNow]);

  const reload = useCallback(async () => {
    setReloading(true);
    await fetchNow();
    setReloading(false);
  }, [fetchNow]);

  const current = state.path === path;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: !!path && (!current || reloading),
    reload,
    setData: (data: T | null) => setState((s) => ({ ...s, data })),
  };
}
