// import { GoogleGenAI } from "@google/genai";

// const apiKey = process.env.GEMINI_API_KEY;

// if (!apiKey) {
//   throw new Error("GEMINI_API_KEY não foi configurada no .env");
// }

// const ai = new GoogleGenAI({
//   apiKey,
// });

// const interaction = await ai.interactions.create({
//   model: "gemini-3.8-flash",
//   input: "Explain how AI works in a few words",
// });
// console.log(interaction.output_text);

// src/modules/ai/ai.service.ts

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY não configurada.");
}

const ai = new GoogleGenAI({ apiKey });

const model = process.env.GEMINI_MODEL;

if (!model) {
  throw new Error("GEMINI_MODEL não configurado.");
}

type AnalyzePdfParams = {
  pdfBuffer: Buffer;
  input?: string;
};

// Melhorar o Default input
const DEFAULT_INPUT = `
Analise o documento PDF fornecido.
Identifique o assunto principal, os tópicos mais importantes,
a estrutura do documento e informações relevantes.
Organize a resposta em português, com títulos e listas quando apropriado.
Não invente informações que não estejam sustentadas pelo documento.
`;

export async function analyzePdf({
  pdfBuffer,
  input,
}: AnalyzePdfParams): Promise<string> {
  const prompt = input || DEFAULT_INPUT;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBuffer.toString("base64"),
            },
          },
        ],
      },
    ],
  });

  const result = response.text;

  if (!result) {
    throw new Error("A IA não retornou conteúdo.");
  }

  return result;
}