export type LlmProvider = 'ANTHROPIC' | 'OPENAI' | 'GROQ' | 'OLLAMA';

export const LLM_PROVIDER_LABELS: Record<LlmProvider, string> = {
  ANTHROPIC: 'Anthropic (Claude)',
  OPENAI: 'OpenAI',
  GROQ: 'Groq (free tier)',
  OLLAMA: 'Ollama (local)',
};

/** Environment variable on the API that holds each provider's key (Ollama needs none). */
export const LLM_API_KEY_VARIABLES: Record<LlmProvider, string> = {
  ANTHROPIC: 'ANTHROPIC_API_KEY',
  OPENAI: 'OPENAI_API_KEY',
  GROQ: 'GROQ_API_KEY',
  OLLAMA: '—',
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
