/**
 * LLM provider abstraction.
 *
 * Each provider (OpenAI / Anthropic / Mock) implements the same surface so
 * commands can call `provider.chat(...)` without caring which vendor is on
 * the other end.
 *
 * v2.3 multi-model routing will allow per-skill provider selection — the
 * factory layer reads core/config + skill name and returns the right provider
 * instance.
 */

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatOptions {
  /** Sampling temperature. Defaults set per-skill (writer 0.7, auditor 0.3). */
  temperature?: number;
  /** Max output tokens. */
  maxTokens?: number;
  /** Optional stop sequences. */
  stop?: string[];
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
}

export interface ChatUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ChatResponse {
  content: string;
  usage: ChatUsage;
  /** Underlying response identifier (for debugging / observability). */
  responseId?: string;
}

export interface LLMProvider {
  /** Provider identifier (`openai` / `anthropic` / `mock`). */
  readonly name: string;
  /** Resolved model id, e.g. `gpt-4o-mini`. */
  readonly model: string;
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<ChatResponse>;
}
