import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

type ProxyErrorData = {
  error?: string;
  retryAfter?: number;
  isQuotaError?: boolean;
};

export type GeminiModelInfo = {
  id: string; // e.g. "gemini-2.5-flash-lite"
  name: string; // raw API name, e.g. "models/gemini-2.5-flash-lite"
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
};

export type OpenAIModelInfo = {
  id: string;
  ownedBy?: string;
};

export type AnthropicModelInfo = {
  id: string;
  displayName?: string;
};

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterSeconds(error: unknown): number | null {
  if (!axios.isAxiosError(error)) return null;

  const headerValue = error.response?.headers?.['retry-after'];
  if (typeof headerValue === 'string') {
    const parsed = Number(headerValue);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const data = error.response?.data as ProxyErrorData | undefined;
  if (data?.retryAfter && Number.isFinite(data.retryAfter) && data.retryAfter > 0) {
    return data.retryAfter;
  }

  return null;
}

function isProxyFetchFailed(error: unknown) {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  const message = String((error.response?.data as ProxyErrorData | undefined)?.error || error.message || "");
  return status === 500 && message.toLowerCase().includes('fetch failed');
}

function getBrowserGeminiApiKey(customApiKey?: string) {
  return (
    customApiKey ||
    ((import.meta as any)?.env?.VITE_GEMINI_API_KEY as string | undefined) ||
    undefined
  );
}

export async function listGeminiModels(customApiKey?: string): Promise<GeminiModelInfo[]> {
  const apiKey = getBrowserGeminiApiKey(customApiKey);
  if (!apiKey) throw new Error("Gemini API key is missing");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Failed to list models (status ${response.status})`;
    throw new Error(message);
  }

  const data = (await response.json()) as any;
  const models = Array.isArray(data?.models) ? data.models : [];

  return models
    .map((m: any) => {
      const rawName = String(m?.name || "");
      const id = rawName.replace(/^models\//, "");
      return {
        id,
        name: rawName,
        displayName: m?.displayName,
        description: m?.description,
        supportedGenerationMethods: Array.isArray(m?.supportedGenerationMethods) ? m.supportedGenerationMethods : undefined,
      } satisfies GeminiModelInfo;
    })
    .filter((m: GeminiModelInfo) => !!m.id);
}

export async function listOpenAIModels(apiKey: string): Promise<OpenAIModelInfo[]> {
  if (!apiKey) throw new Error("OpenAI API key is missing");

  const data = await postWith429Retry<{ models?: any[] }>('/api/ai/openai/models', {
    customApiKey: apiKey,
  });

  const models = Array.isArray(data?.models) ? data.models : [];
  return models
    .map((m: any) => ({ id: String(m?.id || ""), ownedBy: m?.owned_by } satisfies OpenAIModelInfo))
    .filter((m: OpenAIModelInfo) => !!m.id);
}

export async function listAnthropicModels(apiKey: string): Promise<AnthropicModelInfo[]> {
  if (!apiKey) throw new Error("Anthropic API key is missing");

  const data = await postWith429Retry<{ models?: any[] }>('/api/ai/anthropic/models', {
    customApiKey: apiKey,
  });

  const models = Array.isArray(data?.models) ? data.models : [];
  return models
    .map((m: any) => ({ id: String(m?.id || ""), displayName: m?.display_name } satisfies AnthropicModelInfo))
    .filter((m: AnthropicModelInfo) => !!m.id);
}

async function chatDirectWithOpenAI(
  messages: { role: string; content: string }[],
  systemInstruction: string,
  apiKey: string,
  model?: string
): Promise<string> {
  const selectedModel = model || "gpt-4.1-mini";

  const data = await postWith429Retry<{ text?: string }>('/api/ai/openai/chat', {
    messages,
    systemInstruction,
    customApiKey: apiKey,
    model: selectedModel,
  });

  return data.text || "No response from AI";
}

async function chatDirectWithAnthropic(
  messages: { role: string; content: string }[],
  systemInstruction: string,
  apiKey: string,
  model?: string
): Promise<string> {
  const selectedModel = model || "claude-sonnet-4-20250514";

  const data = await postWith429Retry<{ text?: string }>('/api/ai/anthropic/chat', {
    messages,
    systemInstruction,
    customApiKey: apiKey,
    model: selectedModel,
  });

  return data.text || "No response from AI";
}

function extractGeminiRetryAfterSeconds(message: string): number | null {
  const m = message.match(/retry in ([\d.]+)s/i);
  if (!m) return null;
  const seconds = Math.ceil(parseFloat(m[1]));
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

function hasZeroQuota(message: string): boolean {
  return /limit:\s*0\b/i.test(message) || /limit:\s*0,\s*model:/i.test(message);
}

function getBrowserGeminiChatModel() {
  return ((import.meta as any)?.env?.VITE_GEMINI_CHAT_MODEL as string | undefined) || "gemini-2.5-flash-lite";
}

async function chatDirectWithGemini(
  messages: { role: string; content: string; images?: string[] }[],
  systemInstruction: string,
  apiKey: string,
  model?: string
): Promise<string> {
  if (messages.some((m) => Array.isArray(m.images) && m.images.length > 0)) {
    throw new Error("Gemini proxy is unavailable, and direct browser chat doesn't support image messages yet.");
  }

  const ai = new GoogleGenAI({ apiKey });

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const chat = ai.chats.create({
        model: model || getBrowserGeminiChatModel(),
        config: { systemInstruction },
        history: messages.slice(0, -1).map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      });

      const last = messages[messages.length - 1];
      const result = await chat.sendMessage({ message: [{ text: last?.content || "" }] });
      return result.text || "No response from AI";
    } catch (e: any) {
      const status = e?.status;
      const message = String(e?.message || "");
      if (status !== 429) throw e;

      if (hasZeroQuota(message)) {
        throw new Error(
          `Gemini quota for this API key is 0 for model \"${model || getBrowserGeminiChatModel()}\". Enable billing / request access in Google AI Studio, choose a different model, or use a different API key.`
        );
      }

      if (attempt >= 2) throw e;
      const retryAfterSeconds = extractGeminiRetryAfterSeconds(message) ?? 15;
      attempt += 1;
      await sleep(retryAfterSeconds * 1000 + Math.floor(Math.random() * 250));
    }
  }
}

async function postWith429Retry<T>(
  url: string,
  payload: unknown,
  {
    maxRetries = 2,
    baseBackoffMs = 1200,
  }: { maxRetries?: number; baseBackoffMs?: number } = {}
): Promise<T> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const response = await axios.post<T>(url, payload);
      return response.data;
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status !== 429 || attempt >= maxRetries) throw error;

      const retryAfterSeconds = getRetryAfterSeconds(error);
      const backoffMs =
        (retryAfterSeconds ? retryAfterSeconds * 1000 : baseBackoffMs * Math.pow(2, attempt)) +
        Math.floor(Math.random() * 250);

      attempt += 1;
      await sleep(backoffMs);
    }
  }
}

/**
 * Enhances a simple prompt using AI (Magic Prompt feature)
 */
export async function enhancePrompt(prompt: string, customApiKey?: string, model?: string) {
  try {
    const directKey = getBrowserGeminiApiKey(customApiKey);
    if (directKey) {
      const ai = new GoogleGenAI({ apiKey: directKey });
      const systemInstruction =
        "Transform a user's descriptive text into a concise, evocative, and artistic prompt suitable for generating a stunning AI image. Focus on key visual elements like style, lighting, clothing, and mood. Output only the prompt. No explanations.";
      const response = await ai.models.generateContent({
        model: model || getBrowserGeminiChatModel(),
        contents: `${systemInstruction}\n\nUser Prompt: \"${prompt}\"`,
      });
      return response.text || prompt;
    }

    const response = await axios.post('/api/ai/enhance-prompt', {
      prompt,
      customApiKey,
      model
    });
    return response.data.text || prompt;
  } catch (error) {
    if (isProxyFetchFailed(error)) {
      const key = getBrowserGeminiApiKey(customApiKey);
      if (!key) return prompt;
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const systemInstruction =
          "Transform a user's descriptive text into a concise, evocative, and artistic prompt suitable for generating a stunning AI image. Focus on key visual elements like style, lighting, clothing, and mood. Output only the prompt. No explanations.";
        const response = await ai.models.generateContent({
          model: model || getBrowserGeminiChatModel(),
          contents: `${systemInstruction}\n\nUser Prompt: "${prompt}"`,
        });
        return response.text || prompt;
      } catch {
        return prompt;
      }
    }
    console.error("Magic Prompt Error:", error);
    return prompt;
  }
}

/**
 * Multi-turn chat with AI
 */
export async function chatWithAI(
  messages: { role: string; content: string; images?: string[] }[],
  systemInstruction: string,
  customApiKey?: string,
  model?: string
) {
  return chatWithAIModel(messages, systemInstruction, customApiKey, model);
}

export async function chatWithAIModel(
  messages: { role: string; content: string; images?: string[] }[],
  systemInstruction: string,
  customApiKey?: string,
  model?: string
) {
  try {
    const directKey = getBrowserGeminiApiKey(customApiKey);
    const hasImages = messages.some((m) => Array.isArray(m.images) && m.images.length > 0);
    if (directKey && !hasImages) {
      return chatDirectWithGemini(messages, systemInstruction, directKey, model);
    }

    const data = await postWith429Retry<{ text?: string }>('/api/ai/chat', {
      messages,
      systemInstruction,
      customApiKey,
      model
    });
    return data.text || "I'm sorry, I couldn't process that.";
  } catch (error) {
    // In this Codex environment, the backend may not have outbound network access,
    // causing the Gemini SDK to throw "fetch failed". Fall back to a direct call
    // from the browser when the user provided their own key.
    if (isProxyFetchFailed(error)) {
      const key = getBrowserGeminiApiKey(customApiKey);
      if (!key) throw error;
      return chatDirectWithGemini(messages, systemInstruction, key, model);
    }
    console.error("Chat Proxy Error:", error);
    throw error;
  }
}

export async function chatWithProvider(params: {
  provider: AIProvider;
  messages: { role: string; content: string; images?: string[] }[];
  systemInstruction: string;
  apiKey: string;
  model?: string;
}) {
  const { provider, messages, systemInstruction, apiKey, model } = params;

  if (provider === 'gemini') {
    return chatWithAIModel(messages, systemInstruction, apiKey, model);
  }

  // Only support text chat for non-Gemini providers for now.
  if (messages.some((m) => Array.isArray(m.images) && m.images.length > 0)) {
    throw new Error(`${provider} chat does not support image messages in this app yet.`);
  }

  const plainMessages = messages.map((m) => ({ role: m.role, content: m.content }));

  if (provider === 'openai') {
    return chatDirectWithOpenAI(plainMessages, systemInstruction, apiKey, model);
  }

  if (provider === 'anthropic') {
    return chatDirectWithAnthropic(plainMessages, systemInstruction, apiKey, model);
  }

  throw new Error(`Unsupported provider: ${provider}`);
}
