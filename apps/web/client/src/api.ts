import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type {
  AssetEnvelope,
  BooksResponse,
  BuildEvent,
  DraftResult,
  StatusReport,
  WorldBuildState,
  WorldStepKey,
} from './types';

/** GET JSON. Throws Error(message) on !ok, surfacing the server's error text. */
export async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(await errorText(res));
  return (await res.json()) as T;
}

/** POST JSON. Throws Error(message) on !ok. */
export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(await errorText(res));
  return (await res.json()) as T;
}

async function errorText(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string; hint?: string };
    const parts = [body.error ?? res.statusText];
    if (body.hint) parts.push(`(${body.hint})`);
    return `${res.status} · ${parts.join(' ')}`;
  } catch {
    return `${res.status} · ${res.statusText}`;
  }
}

// ---- read queries ----

export function useBooks(): UseQueryResult<BooksResponse, Error> {
  return useQuery({ queryKey: ['books'], queryFn: () => fetchJson<BooksResponse>('/api/workspace/books') });
}

export function useStatus(bookId: string): UseQueryResult<StatusReport, Error> {
  return useQuery({
    queryKey: ['status', bookId],
    queryFn: () => fetchJson<StatusReport>(`/api/books/${bookId}/status`),
  });
}

export function useAsset(
  bookId: string,
  sub: string,
  enabled = true,
): UseQueryResult<AssetEnvelope, Error> {
  return useQuery({
    queryKey: ['asset', bookId, sub],
    queryFn: () => fetchJson<AssetEnvelope>(`/api/books/${bookId}/assets/${sub}`),
    enabled,
  });
}

// ---- build (write) ----

export function useWorldBuild(bookId: string): UseQueryResult<WorldBuildState, Error> {
  return useQuery({
    queryKey: ['build', 'world', bookId],
    queryFn: () => fetchJson<WorldBuildState>(`/api/books/${bookId}/build/world`),
  });
}

export function useDraftWorldStep(
  bookId: string,
): UseMutationResult<DraftResult, Error, { step: WorldStepKey; hint?: string; currentData?: unknown; mock?: boolean }> {
  return useMutation({
    mutationFn: (vars) =>
      postJson<DraftResult>(`/api/books/${bookId}/build/world/step/${vars.step}/draft`, {
        hint: vars.hint,
        currentData: vars.currentData,
        mock: vars.mock ?? false,
      }),
  });
}

/** Invalidate everything affected by a world write. */
function invalidateWorld(qc: ReturnType<typeof useQueryClient>, bookId: string, step?: WorldStepKey): void {
  if (step) void qc.invalidateQueries({ queryKey: ['asset', bookId, `world/${step}`] });
  void qc.invalidateQueries({ queryKey: ['build', 'world', bookId] });
  void qc.invalidateQueries({ queryKey: ['status', bookId] });
  void qc.invalidateQueries({ queryKey: ['books'] });
}

export function useAcceptWorldStep(
  bookId: string,
): UseMutationResult<{ ok: boolean }, Error, { step: WorldStepKey; data: unknown }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) =>
      postJson<{ ok: boolean }>(`/api/books/${bookId}/build/world/step/${vars.step}/accept`, {
        data: vars.data,
      }),
    onSuccess: (_d, vars) => invalidateWorld(qc, bookId, vars.step),
  });
}

export function useSkipWorldStep(
  bookId: string,
): UseMutationResult<{ ok: boolean }, Error, { step: WorldStepKey }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) =>
      postJson<{ ok: boolean }>(`/api/books/${bookId}/build/world/step/${vars.step}/skip`, {}),
    onSuccess: (_d, vars) => invalidateWorld(qc, bookId, vars.step),
  });
}

export function useApproveWorld(
  bookId: string,
): UseMutationResult<{ ok: boolean }, Error, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => postJson<{ ok: boolean }>(`/api/books/${bookId}/build/world/approve`, {}),
    onSuccess: () => invalidateWorld(qc, bookId),
  });
}

/** Subscribe to the server's SSE build-progress channel (filtered by book). */
export function useBuildEvents(bookId: string): BuildEvent | null {
  const [last, setLast] = useState<BuildEvent | null>(null);
  useEffect(() => {
    const es = new EventSource(`/api/books/${bookId}/build/events`);
    const onBuild = (ev: MessageEvent<string>) => {
      try {
        const e = JSON.parse(ev.data) as BuildEvent;
        if (e.bookId === bookId) setLast(e);
      } catch {
        // ignore malformed event
      }
    };
    es.addEventListener('build', onBuild as EventListener);
    return () => {
      es.removeEventListener('build', onBuild as EventListener);
      es.close();
    };
  }, [bookId]);
  return last;
}
