/**
 * Mock provider — deterministic, offline. Used by tests and by `--mock-llm`.
 *
 * Returns a templated response that includes the last user message verbatim,
 * which is enough for the workflow tests to check that the right prompt got
 * through.
 */
import type { ChatMessage, ChatOptions, ChatResponse, LLMProvider } from './provider.js';

export interface MockProviderOptions {
  model?: string;
  /** Custom canned responses (queue). Falls back to the default echo behavior. */
  responses?: string[];
}

export class MockProvider implements LLMProvider {
  readonly name = 'mock';
  readonly model: string;
  private queue: string[];

  constructor(opts: MockProviderOptions = {}) {
    this.model = opts.model ?? 'mock-model';
    this.queue = [...(opts.responses ?? [])];
  }

  async chat(messages: ChatMessage[], _opts: ChatOptions = {}): Promise<ChatResponse> {
    const queued = this.queue.shift();
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const content = queued ?? `[mock] echo: ${lastUser.slice(0, 200)}`;
    return {
      content,
      usage: {
        inputTokens: messages.reduce((acc, m) => acc + m.content.length, 0),
        outputTokens: content.length,
      },
      responseId: 'mock-response',
    };
  }

  /** Push one canned response to the queue (FIFO). */
  enqueue(response: string): void {
    this.queue.push(response);
  }
}
