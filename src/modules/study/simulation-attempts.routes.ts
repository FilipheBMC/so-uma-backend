import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import { authenticate } from "../auth/auth.middleware.js";
import {
  AttemptNotFoundError,
  InvalidAttemptAnswerError,
  InvalidAttemptStateError,
  SimulationNotFoundError,
  finishSimulationAttempt,
  saveSimulationAnswer,
  startSimulationAttempt,
} from "./simulation-attempts.service.js";

type SaveAnswerBody = {
  questionExternalId: string;
  selectedAlternativeLetter: string;
  timeSpentSeconds?: number;
};

function sendDomainError(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof SimulationNotFoundError || error instanceof AttemptNotFoundError) {
    return reply.code(404).send({ message: error.message });
  }

  if (error instanceof InvalidAttemptAnswerError) {
    return reply.code(400).send({ message: error.message });
  }

  if (error instanceof InvalidAttemptStateError) {
    return reply.code(409).send({ message: error.message });
  }

  request.log.error({ err: error }, "Erro no módulo de tentativas");
  return reply.code(500).send({ message: "Ocorreu um erro interno." });
}

export const simulationAttemptsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", authenticate);

  // Cria uma nova tentativa para o usuário autenticado.
  app.post<{
    Params: { simulationId: string };
  }>("/:simulationId/attempts", async (request, reply) => {
    try {
      const attempt = await startSimulationAttempt({
        simulationId: request.params.simulationId,
        userId: request.user.sub,
      });

      return reply.code(201).send({ attempt });
    } catch (error) {
      return sendDomainError(error, request, reply);
    }
  });

  // Registra ou substitui a resposta de uma questão na tentativa.
  app.put<{
    Params: { attemptId: string };
    Body: SaveAnswerBody;
  }>(
    "/attempts/:attemptId/answers",
    {
      schema: {
        body: {
          type: "object",
          required: ["questionExternalId", "selectedAlternativeLetter"],
          additionalProperties: false,
          properties: {
            questionExternalId: { type: "string", minLength: 1, maxLength: 200 },
            selectedAlternativeLetter: { type: "string", minLength: 1, maxLength: 10 },
            timeSpentSeconds: { type: "integer", minimum: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        await saveSimulationAnswer({
          attemptId: request.params.attemptId,
          userId: request.user.sub,
          ...request.body,
        });

        return reply.code(200).send({ saved: true });
      } catch (error) {
        return sendDomainError(error, request, reply);
      }
    },
  );

  // Finaliza a tentativa e registra submitted_at.
  app.patch<{
    Params: { attemptId: string };
  }>("/attempts/:attemptId/finish", async (request, reply) => {
    try {
      const attempt = await finishSimulationAttempt(
        request.params.attemptId,
        request.user.sub,
      );

      return reply.code(200).send({ attempt });
    } catch (error) {
      return sendDomainError(error, request, reply);
    }
  });
};
