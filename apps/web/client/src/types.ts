// Lightweight mirrors of the M1 server's JSON shapes. Asset payloads are kept
// `unknown` and rendered generically (the read path doesn't need exact types).

export interface BookSummary {
  id: string;
  path: string;
  projectId: string;
  title: string;
  genre: string[];
  blueprintStatus: string;
  outlineStatus: string;
  targetChapters: number | null;
  currentChapter: number;
}

export interface BooksResponse {
  workspace: string;
  books: BookSummary[];
}

export interface NextStep {
  title: string;
  command?: string;
  skill?: string;
}

export interface StatusReport {
  stage: string;
  headline?: string;
  summary?: string;
  details?: string[];
  nextSteps?: NextStep[];
  novel?: Record<string, unknown> | null;
}

/** Every /assets/* endpoint returns this envelope. */
export interface AssetEnvelope {
  exists: boolean;
  data?: unknown;
}

/** outlineStatus() payload (for the outline navigator). */
export interface OutlineStatus {
  hasMaster: boolean;
  volumeNumbers: number[];
  chapterNumbers: number[];
  volumeCount: number;
  chapterOutlineCount: number;
}


// ---- build (M3) ----

export type WorldStepKey = 'worldview' | 'powers' | 'cheat-system';

export interface WorldStepState {
  key: WorldStepKey;
  label: string;
  exists: boolean;
}

export interface WorldBuildState {
  steps: WorldStepState[];
  allPresent: boolean;
}

export interface DraftResult {
  step: WorldStepKey;
  ok: boolean;
  data?: unknown;
  issues?: string[];
  rawPreview?: string;
}

export interface BuildEvent {
  bookId: string;
  type: 'draft-start' | 'draft-done' | 'saved' | 'approved' | 'error';
  step?: string;
  ok?: boolean;
  message?: string;
}
