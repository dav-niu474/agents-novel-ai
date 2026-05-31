import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AssetEnvelope, BooksResponse, StatusReport } from './types';

/** Fetch JSON from the server (dev: proxied to 127.0.0.1:4567). Throws on !ok. */
export async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) detail = body.error;
    } catch {
      // non-JSON error body; keep statusText
    }
    throw new Error(`${res.status} · ${detail}`);
  }
  return (await res.json()) as T;
}

export function useBooks(): UseQueryResult<BooksResponse, Error> {
  return useQuery({
    queryKey: ['books'],
    queryFn: () => fetchJson<BooksResponse>('/api/workspace/books'),
  });
}

export function useStatus(bookId: string): UseQueryResult<StatusReport, Error> {
  return useQuery({
    queryKey: ['status', bookId],
    queryFn: () => fetchJson<StatusReport>(`/api/books/${bookId}/status`),
  });
}

/**
 * Read one asset by its sub-path, e.g. 'blueprint', 'world/worldview',
 * 'characters', 'relationships', 'outline', 'outline/master',
 * 'outline/chapters/1'. `enabled=false` defers the request (lazy drill-down).
 */
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
