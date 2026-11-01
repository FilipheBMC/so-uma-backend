import { extractText, getDocumentProxy } from "unpdf";
import { TransformWithAITextInJson } from "../ai/openrouter.service.js";
import type { EditalAnalysis } from "./types/editalAnalysis.interface.js";

// Extrator de texto do pdf
export const editalAnalyse = async (
  pdfBuffer: Buffer,
): Promise<string> => {
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    throw new Error("O arquivo PDF está vazio ou é inválido.");
  }

  if (pdfBuffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("O arquivo enviado não é um PDF válido.");
  }

  const pdf = await getDocumentProxy(
    new Uint8Array(pdfBuffer),
  );

  const { text } = await extractText(pdf, {
    mergePages: true,
  });

  const extractedText = (
    Array.isArray(text) ? text.join("\n") : text
  )
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!extractedText) {
    throw new Error(
      "Não foi possível extrair texto do PDF. " +
        "O documento pode estar digitalizado como imagem.",
    );
  }

  return extractedText;
};

/**
 * Processo para extração do objeto disiclina
 * 
 */
export async function AnalyseEditalByuserText(
    obj: Pick<EditalAnalysis, "concurso" | "disciplinas">
) {
    const { disciplinas } = obj;

    const disciplinasAtualizadas = await Promise.all(
      disciplinas.map(async (disciplina) => {

        const response = await TransformWithAITextInJson(
          disciplina.topicos
        ) as { topicos: string[] };
        return {
          ...disciplina,
          topicos: response.topicos
        };
      })
    )

    const topicos = disciplinas.flatMap(
        disciplina => disciplina.topicos
    );
    // const response = await TransformWithAITextInJson(topicos);

    // studyOrchestror()

    return {
      ...obj,
      disciplinas: disciplinasAtualizadas
    };
}