/**
 * OpenAI provider — uses the official `openai` SDK Chat Completions API.
 */
import OpenAI from 'openai';
import type { ChatMessage, ChatOptions, ChatResponse, LLMProvider } from './provider.js';

export interface OpenAIProviderOptions {
  apiKey: string;
  baseURL?: string;
  model: string;
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly model: string;
  private readonly client: OpenAI;

  constructor(opts: OpenAIProviderOptions) {
    this.model = opts.model;
    this.client = new OpenAI({
      apiKey: opts.apiKey,
      ...(opts.baseURL !== undefined ? { baseURL: opts.baseURL } : {}),
    });
  }

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResponse> {
    const completion = await this.client.chat.completions.create(
      {
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
        ...(opts.maxTokens !== undefined ? { max_tokens: opts.maxTokens } : {}),
        ...(opts.stop !== undefined ? { stop: opts.stop } : {}),
      },
      opts.signal !== undefined ? { signal: opts.signal } : {},
    );
    const choice = completion.choices[0];
    return {
      content: choice?.message?.content ?? '',
      usage: {
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
      },
      responseId: completion.id,
    };
  }
}
