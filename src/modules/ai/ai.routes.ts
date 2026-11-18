import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../auth/auth.middleware.js";
import type { QuestionTutorInput } from "./ai.types.js";
import { askQuestionTutor } from "./question-tutor.service.js";

const questionTutorBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["question", "messages"],
  properties: {
    question: {
      type: "object",
      additionalProperties: false,
      required: [
        "statement",
        "alternatives",
        "subject",
        "topic",
        "userAnswer",
        "correctAnswer",
      ],
      properties: {
        statement: {
          type: "string",
          minLength: 1,
          maxLength: 15_000,
        },
        alternatives: {
          type: "array",
          maxItems: 10,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "text"],
            properties: {
              key: { type: "string", minLength: 1, maxLength: 10 },
              text: { type: "string", minLength: 1, maxLength: 3_000 },
            },
          },
        },
        subject: { anyOf: [{ type: "string" }, { type: "null" }] },
        topic: { anyOf: [{ type: "string" }, { type: "null" }] },
        userAnswer: { anyOf: [{ type: "string" }, { type: "null" }] },
        correctAnswer: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
    },
    messages: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["role", "content"],
        properties: {
          role: { type: "string", enum: ["user", "assistant"] },
          content: {
            type: "string",
            minLength: 1,
            maxLength: 4_000,
          },
        },
      },
    },
  },
} as const;

/** Rotas relacionadas ao tutor de questões. */
export const aiRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: QuestionTutorInput }>(
    "/tutor/chat",
    {
      // Autenticação aplicada diretamente a este endpoint.
      preHandler: authenticate,
      schema: {
        body: questionTutorBodySchema,
      },
    },
    async (request, reply) => {
      try {
        const result = await askQuestionTutor(request.body);

        return reply.status(200).send({
          message: "Resposta do tutor gerada com sucesso.",
          reply: result.reply,
          model: result.model,
        });
      } catch (error: unknown) {
        request.log.error(
          { err: error },
          "Erro ao gerar resposta do tutor de questões.",
        );

        const errorMessage =
          error instanceof Error ? error.message : "Erro desconhecido.";

        if (
          errorMessage.includes("OPENROUTER_API_KEY") ||
          errorMessage.includes("OPENROUTER_TUTOR_MODEL")
        ) {
          return reply.status(500).send({
            message: "O serviço do tutor não está configurado corretamente.",
          });
        }

        return reply.status(502).send({
          message:
            "Não foi possível obter uma resposta do tutor. Tente novamente.",
        });
      }
    },
  );
};
