/**
 * In-memory build-progress pub/sub for the SSE channel.
 *
 * Single-user, single-process: one global EventEmitter. The SSE endpoint
 * subscribes and forwards events; mutation handlers emit them. Clients filter
 * by `bookId` on the receiving end.
 *
 * This is *progress* signalling only (draft-start / draft-done / saved /
 * approved / error). Token-level streaming of LLM output is reserved for the
 * chapter-writing milestone (see docs/design/05-web-studio.md §7.3).
 */
import { EventEmitter } from 'node:events';

export interface BuildEvent {
  bookId: string;
  type: 'draft-start' | 'draft-done' | 'saved' | 'approved' | 'error';
  step?: string;
  ok?: boolean;
  message?: string;
}

const emitter = new EventEmitter();
emitter.setMaxListeners(100);
const CHANNEL = 'build';

export function emitBuildEvent(event: BuildEvent): void {
  emitter.emit(CHANNEL, event);
}

export function subscribeBuildEvents(listener: (event: BuildEvent) => void): () => void {
  emitter.on(CHANNEL, listener);
  return () => emitter.off(CHANNEL, listener);
}
