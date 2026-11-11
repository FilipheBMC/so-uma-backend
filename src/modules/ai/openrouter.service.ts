// import type { EditalAnalysis } from "../edital-analysis/types/editalAnalysis.interface.js";
import { NEW_PROMPT, PROMPT_EDITAL_TEXT_TO_JSON, PROMPT_TO_PDF } from "./prompts/prompts.js";

export interface EditalAnalysis {
  totalQuestions: number | null;

  groups: {
    name: string;
    questionCount: number | null;
  }[];

  subjects: {
    name: string;
    group: string | null;
    questionCount: number | null;
  }[];
}

type AnalyzeTextWithOpenRouterParams = {
  text: string;
  prompt: string;
  outputFormat?: "json" | "text";
};

type OpenRouterResponse = {
  model?: string;
  choices?: {
    finish_reason?: string | null;
    message?: {
      content?: string | null;
      refusal?: string | null;
    };
  }[];
  error?: {
    message?: string;
  };
};

const apiKey  = process.env.OPENROUTER_API_KEY;
const model   = process.env.OPENROUTER_MODEL ?? "openrouter/free";

if(!apiKey) {
  throw new Error("OPEN ROUTER NÃO ESTÁ CONFIGURADO");
};

export async function analyzeTextWithOpenRouter({
  text,
  prompt,
  outputFormat = "json",
}: AnalyzeTextWithOpenRouterParams): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY não configurada.");
  }

  if (!text.trim()) {
    throw new Error("O texto enviado para análise está vazio.");
  }

  if (!prompt.trim()) {
    throw new Error("O prompt da análise não foi informado.");
  }

  const model = process.env.OPENROUTER_MODEL ?? "openrouter/free";

  const requestBody = {
    model,
    messages: [
      {
        role: "system" as const,
        content: prompt,
      },
      {
        role: "user" as const,
        content: text,
      },
    ],
    temperature: 0.1,
    ...(outputFormat === "json"
      ? {
          response_format: {
            type: "json_object" as const,
          },
        }
      : {}),
  };

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(120_000),
    },
  );

  const responseText = await response.text();

  let data: OpenRouterResponse;

  try {
    data = JSON.parse(responseText) as OpenRouterResponse;
  } catch {
    throw new Error(
      `O OpenRouter retornou uma resposta inválida. HTTP ${response.status}.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Erro OpenRouter (${response.status}): ${
        data.error?.message ?? "Falha na requisição."
      }`,
    );
  }

  const result = data.choices?.[0]?.message?.content;

  if (typeof result !== "string" || !result.trim()) {
    const refusal = data.choices?.[0]?.message?.refusal;

    throw new Error(
      refusal || "O OpenRouter não retornou conteúdo.",
    );
  }

  if (outputFormat === "json") {
    try {
      JSON.parse(result);
    } catch {
      throw new Error(
        "A IA respondeu, mas o conteúdo não é um JSON válido.",
      );
    }
  }

  return result;
}

export async function TransformWithAITextInJson(text: string[]) {
    //  if (!text.trim()) {
    //     throw new Error("O texto enviado está vazio.");
    // }

    const requestBody = {
        model,

        messages: [
            {
                role: "system" as const,
                content: PROMPT_EDITAL_TEXT_TO_JSON
            },
            {
                role: "user" as const,
                content: JSON.stringify({
                  topicos: text
                })
            }
        ],

        temperature: 0.1,

        response_format: {
            type: "json_object" as const
        }
    };

    const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            method: "POST",

            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },

            body: JSON.stringify(requestBody),

            signal: AbortSignal.timeout(120_000)
        }
    );

    const responseText = await response.text();

    let data: OpenRouterResponse;

    try {
        data = JSON.parse(responseText) as OpenRouterResponse;
    } catch {
        throw new Error(
            `O OpenRouter retornou uma resposta inválida. HTTP ${response.status}.`
        );
    }

    if (!response.ok) {
        throw new Error(
            `Erro OpenRouter (${response.status}): ${
                data.error?.message ?? "Falha na requisição."
            }`
        );
    }

    const result = data.choices?.[0]?.message?.content;

    if (typeof result !== "string" || !result.trim()) {
        throw new Error("A IA não retornou conteúdo.");
    }

    try {
        return JSON.parse(result);
    } catch {
        throw new Error("A IA retornou um JSON inválido.");
    }
}

export async function AnalyseTextFromPDF(
  data: string,
): Promise<EditalAnalysis> {

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY não configurada.");
  }

  if (!data.trim()) {
    throw new Error("O texto do edital está vazio.");
  }

  const messages = [
    {
      role: "system" as const,
      content: NEW_PROMPT,
    },
    {
      role: "user" as const,
      content: data,
    },
  ];

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v4-flash",
        messages,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Erro OpenRouter (${response.status}): ${error}`,
    );
  }

  // 1. Recebe o objeto completo da API.
  const result = await response.json() as OpenRouterResponse;

  // 2. Acessa somente o conteúdo produzido pela IA.
  const content = result.choices?.[0]?.message?.content;

  if (!content || !content.trim()) {
    throw new Error("A IA não retornou conteúdo.");
  }

  console.log("Modelo utilizado:", result.model);
  console.log("Resposta da IA:", content);

  // 3. Converte o texto JSON da IA em objeto JavaScript.
  let analysis: unknown;

  try {
    analysis = JSON.parse(content);
  } catch {
    throw new Error(
      "A IA retornou uma resposta que não é um JSON válido.",
    );
  }

  // 4. Verifica a estrutura básica esperada.
  if (
    typeof analysis !== "object" ||
    analysis === null ||
    !("subjects" in analysis) ||
    !Array.isArray(analysis.subjects) ||
    !("groups" in analysis) ||
    !Array.isArray(analysis.groups)
  ) {
    throw new Error(
      "A estrutura retornada pela IA é inválida.",
    );
  }

  return analysis as EditalAnalysis;
}
