import type { OpenRouterChatMessage } from "./ai.types.js";

interface OpenRouterChatCompletionParams {
  /** Identificador do modelo cadastrado na OpenRouter. */
  model: string;
  messages: OpenRouterChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

interface OpenRouterChatCompletionResponse {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
      refusal?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

/**
 * Executa uma chamada genérica ao endpoint Chat Completions da OpenRouter.
 * Este serviço não conhece as regras do tutor nem o contexto de questões.
 */
export async function createOpenRouterChatCompletion({
  model,
  messages,
  temperature = 0.3,
  maxTokens = 900,
}: OpenRouterChatCompletionParams): Promise<{ content: string; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY não configurada.");
  }

  const normalizedModel = model.trim();

  if (!normalizedModel) {
    throw new Error("O identificador do modelo da OpenRouter não foi informado.");
  }

  if (messages.length === 0) {
    throw new Error("A conversa precisa conter pelo menos uma mensagem.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: normalizedModel,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  const responseText = await response.text();
  let data: OpenRouterChatCompletionResponse;

  try {
    data = JSON.parse(responseText) as OpenRouterChatCompletionResponse;
  } catch {
    throw new Error(
      `A OpenRouter retornou uma resposta inválida (HTTP ${response.status}).`,
    );
  }

  if (!response.ok) {
    const providerMessage = data.error?.message ?? "Falha na requisição.";
    throw new Error(`Erro OpenRouter (${response.status}): ${providerMessage}`);
  }

  const message = data.choices?.[0]?.message;
  const content = message?.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error(
      message?.refusal ?? "A OpenRouter não retornou uma resposta textual.",
    );
  }

  return {
    content: content.trim(),
    model: data.model ?? normalizedModel,
  };
}
