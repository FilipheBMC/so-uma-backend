import type { FastifyPluginAsync } from "fastify";
import { searchQuestions } from "./questions.service.js";
import type { QuestionSearchFilters } from "./question.types.js";

type QuestionsSearchQuery = {
  provider?: string;
  subject?: string;
  examBoard?: string;
  year?: string;
  page?: string;
  perPage?: string;
  includeAnswerKey?: string;
};

export const questionsRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: QuestionsSearchQuery }>(
    "/search",
    async (request, reply) => {
      const query = request.query;

      const year =
        query.year !== undefined ? Number(query.year) : undefined;

      const page =
        query.page !== undefined ? Number(query.page) : undefined;

      const perPage =
        query.perPage !== undefined
          ? Number(query.perPage)
          : undefined;

      if (
        (query.year !== undefined && !Number.isInteger(year)) ||
        (query.page !== undefined &&
          (!Number.isInteger(page) || Number(page) < 1)) ||
        (query.perPage !== undefined &&
          (!Number.isInteger(perPage) ||
            Number(perPage) < 1 ||
            Number(perPage) > 100))
      ) {
        return reply.code(400).send({
          message:
            "Ano, página ou quantidade inválidos. perPage deve estar entre 1 e 100.",
        });
      }

      const filters: QuestionSearchFilters = {
        ...(query.subject
          ? { subject: query.subject }
          : {}),
        ...(query.examBoard
          ? { examBoard: query.examBoard }
          : {}),
        ...(year !== undefined ? { year } : {}),
        ...(page !== undefined ? { page } : {}),
        ...(perPage !== undefined ? { perPage } : {}),
        ...(query.includeAnswerKey === "true"
          ? { includeAnswerKey: true }
          : {}),
      };

      try {
        const result = await searchQuestions(
          filters,
          query.provider ?? "quest-api",
        );

        return reply.code(200).send({
          data: result,
        });
      } catch (error) {
        request.log.error(
          { err: error },
          "Falha ao buscar questões.",
        );

        return reply.code(502).send({
          message:
            "Não foi possível consultar o provedor de questões.",
        });
      }
    },
  );
};