/**
 * HTTP error type + centralized Hono error handler.
 *
 * - `HttpError` is what route code throws for client-facing failures.
 * - `NovelError` (from @novel/core) — validation/asset errors — map to 400.
 * - Anything else (e.g. ENOENT) maps to 500 with a detail string.
 */
import type { Context } from 'hono';
import { NovelError } from '@novel/core/utils/errors.js';

/** Status codes this server emits (kept literal so Hono's `c.json` types accept them). */
export type HttpStatus = 400 | 404 | 500;

export class HttpError extends Error {
  readonly status: HttpStatus;
  readonly hint: string | undefined;

  constructor(status: HttpStatus, message: string, hint?: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.hint = hint;
  }
}

export function errorHandler(err: Error, c: Context): Response {
  if (err instanceof HttpError) {
    return c.json({ error: err.message, ...(err.hint ? { hint: err.hint } : {}) }, err.status);
  }
  if (err instanceof NovelError) {
    return c.json({ error: err.message, ...(err.hint ? { hint: err.hint } : {}) }, 400);
  }
  const detail = err instanceof Error ? err.message : String(err);
  return c.json({ error: '服务器内部错误', detail }, 500);
}
