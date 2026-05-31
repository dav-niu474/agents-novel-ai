/**
 * Anthropic provider — uses the official `@anthropic-ai/sdk` Messages API.
 *
 * Anthropic's API splits system prompt from messages, so we extract the first
 * `system` message (if any) into the top-level `system` parameter and pass
 * the rest as `messages`.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage, ChatOptions, ChatResponse, LLMProvider } from './provider.js';

export interface AnthropicProviderOptions {
  apiKey: string;
  baseURL?: string;
  model: string;
}

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly model: string;
  private readonly client: Anthropic;

  constructor(opts: AnthropicProviderOptions) {
    this.model = opts.model;
    this.client = new Anthropic({
      apiKey: opts.apiKey,
      ...(opts.baseURL !== undefined ? { baseURL: opts.baseURL } : {}),
    });
  }

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResponse> {
    // Pull out system messages and concatenate them into Anthropic's `system` param.
    const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content);
    const nonSystem = messages.filter((m) => m.role !== 'system');

    const response = await this.client.messages.create(
      {
        model: this.model,
        max_tokens: opts.maxTokens ?? 4096,
        ...(systemParts.length > 0 ? { system: systemParts.join('\n\n') } : {}),
        messages: nonSystem.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
        ...(opts.stop !== undefined ? { stop_sequences: opts.stop } : {}),
      },
      opts.signal !== undefined ? { signal: opts.signal } : {},
    );

    // Concatenate text blocks (we don't use tool-use in alpha-1).
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return {
      content: text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      responseId: response.id,
    };
  }
}
