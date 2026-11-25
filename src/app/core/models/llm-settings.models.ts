export type LlmProvider = 'ANTHROPIC' | 'OPENAI' | 'OLLAMA';

export const LLM_PROVIDER_LABELS: Record<LlmProvider, string> = {
  ANTHROPIC: 'Anthropic (Claude)',
  OPENAI: 'OpenAI',
  OLLAMA: 'Ollama (local)',
};

/** A provider's defaults and whether its API key is set on the server. The key itself is never sent. */
export interface LlmProviderInfo {
  provider: LlmProvider;
  defaultModel: string;
  defaultBaseUrl: string;
  apiKeyRequired: boolean;
  apiKeyConfigured: boolean;
}

/** Response of GET/PUT /api/v1/settings/llm. `saved` is false while the server defaults apply. */
export interface LlmSettings {
  provider: LlmProvider;
  model: string;
  baseUrl: string;
  enabled: boolean;
  saved: boolean;
  providers: LlmProviderInfo[];
}

/** Body of PUT /settings/llm and POST /settings/llm/test. A blank baseUrl means the provider's default. */
export interface LlmSettingsRequest {
  provider: LlmProvider;
  model: string;
  baseUrl: string | null;
  enabled: boolean;
}

export interface LlmConnectionTest {
  ok: boolean;
  message: string;
  provider: LlmProvider;
  model: string;
}
