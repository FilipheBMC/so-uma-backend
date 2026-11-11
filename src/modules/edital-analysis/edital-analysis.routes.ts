import type { FastifyPluginAsync } from "fastify";
import { AnalyseEditalByuserText, editalAnalyse } from "./edital-analysis.service.js";
import type { EditalAnalysis } from "./types/editalAnalysis.interface.js";
import { AnalyseTextFromPDF } from "../ai/openrouter.service.js";
import { studyOrchestror } from "../study/study-preparation.service.js";
import { authenticate } from "../auth/auth.middleware.js";
import type {
  EditalAnalysis as PdfAIAnalysis
} from "../ai/openrouter.service.js";

export type SubjectTopics = {
  assunto: string;
  topicos: string[];
};

export type PdfTextBody = {
  assuntos: SubjectTopics[];
};

const MAX_FILE = 10 * 1024 * 1024; // 10 MB

export const pdfAnalysis: FastifyPluginAsync = async (app) => {
  // Middleware para conseguir validar autenticação
  app.addHook("preHandler", authenticate);

  app.post("/pdf", async (request, reply) => {
    const file = await request.file({
      limits: {
        files: 1,
        fileSize: MAX_FILE,
      },
    });

    if (!file) {
      return reply.status(400).send({
        message: "Envie um arquivo PDF no campo 'pdf'.",
      });
    }

    if (!file.filename.toLowerCase().endsWith(".pdf")) {
      return reply.status(400).send({
        message: "O arquivo precisa ter a extensão .pdf.",
      });
    }

    let pdfBuffer: Buffer;

    try {
      // Lê o arquivo uma única vez.
      pdfBuffer = await file.toBuffer();
    } catch (error: unknown) {
      const code =
        typeof error === "object" &&
          error !== null &&
          "code" in error
          ? error.code
          : undefined;

      if (code === "FST_REQ_FILE_TOO_LARGE") {
        return reply.status(413).send({
          message: "O PDF ultrapassa o limite de 10 MB.",
        });
      }

      throw error;
    }

    // Valida o conteúdo do arquivo.
    if (
      pdfBuffer.length === 0 ||
      pdfBuffer.subarray(0, 5).toString("ascii") !== "%PDF-"
    ) {
      return reply.status(400).send({
        message: "O arquivo enviado não parece ser um PDF válido.",
      });
    }

    request.log.info(
      {
        filename: file.filename,
        sizeBytes: pdfBuffer.length,
      },
      "PDF recebido com sucesso.",
    );

    // Extrai o texto do PDF.
    const textExtracted = await editalAnalyse(pdfBuffer);
    // const result = await AnalyseTextFromPDF(textExtracted);

    // const trying = await studyOrchestror({
    //   source: "edital",
    //   data: result
    // })

    // return reply.status(200).send({
    //   trying
    // })

    const analysis = await AnalyseTextFromPDF(textExtracted);

    return reply.status(200).send({
      message: "Edital analisado com sucesso.",
      analysis,
    });
  });


  app.post<{
    Body: {
      analysis: PdfAIAnalysis;
    };
  }>("/pdf/questions", async (request, reply) => {
    try {
      const { analysis } = request.body;

      // Validação básica dos dados recebidos.
      if (
        !analysis ||
        !Array.isArray(analysis.subjects) ||
        analysis.subjects.length === 0 ||
        !Array.isArray(analysis.groups)
      ) {
        return reply.status(400).send({
          message: "Envie uma análise válida com pelo menos uma matéria.",
        });
      }

      const result = await studyOrchestror({
        source: "edital",
        data: analysis,
      });

      return reply.status(200).send({
        message: "Questões geradas com sucesso.",
        result,
      });

    } catch (error: unknown) {
      request.log.error(error);

      return reply.status(500).send({
        message: "Erro ao gerar questões para as matérias selecionadas.",
      });
    }
  });


  //   TODO
  app.post<{
    Body: Pick<EditalAnalysis, "concurso" | "disciplinas">
  }>(
    "/pdf-text",
    {
      schema: {
        body: {
          type: "object",
          required: ["concurso", "disciplinas"],
          additionalProperties: false,

          properties: {
            concurso: {
              type: "object",
              required: ["nome", "orgao", "banca"],
              additionalProperties: false,
              properties: {
                nome: {
                  type: "string",
                  nullable: true
                },
                orgao: {
                  type: "string",
                  nullable: true
                },
                banca: {
                  type: "string",
                  nullable: true
                }
              }
            },

            disciplinas: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: [
                  "nome",
                  "topicos",
                  "quantidadeQuestoes"
                ],
                additionalProperties: false,

                properties: {
                  nome: {
                    type: "string",
                    nullable: false
                  },
                  topicos: {
                    type: "string",
                  },
                  quantidadeQuestoes: {
                    type: "integer",
                    nullable: true
                  }
                }
              }
            }
          }
        }
      }
    },

    async (request, reply) => {
      try {

        const { concurso, disciplinas } = request.body;

        const response = await AnalyseEditalByuserText({ concurso, disciplinas });

        // return reply.code(200).send({
        //   message: "Conteúdo do edital recebido com sucesso.",
        //   concurso,
        //   disciplinas
        // });
        return reply.code(200).send({
          response
        });

      } catch (error) {

        request.log.error(error);

        return reply.code(500).send({
          error: "Erro ao processar conteúdo do edital."
        });
      }
    }
  );
};