import type { FastifyPluginAsync } from "fastify";
import { searchQuestions } from "./questions.service.js";
import type { QuestApiQuestionFilters } from "./providers/quest-api/interfaces/questao.interface.js";
import { getQuestions } from "./providers/quest-api/provider.service.js";
import { authenticate } from "../auth/auth.middleware.js";


export const questionsRoutes: FastifyPluginAsync = async (app) => {
  // Middleware para conseguir validar autenticação
  app.addHook("preHandler", authenticate);
  /**
   * Essa rota tem que buscar questões por:
   * Banca, ano, matéria, assunto, quantidade por página
   * 
   */
  // TODO -> Colocar outros meios de pesquisa
  app.get<{ Querystring: QuestApiQuestionFilters  }>(
    "/search",
    async (request, reply) => {
      try {
        const query = request.query;

        const questoes = await getQuestions({
          ...(query.banca && { banca: query.banca}),
          ...(query.ano && { ano: query.ano }),
          ...(query.materia && { materia: query.materia }),
          ...(query.assunto && { assunto: query.assunto }),

          page: query.page ?? 1,
          per_page: query.per_page ?? 5
        });

        return reply.send(questoes);
      }
      catch (error) {
        request.log.error(error);

        return reply.code(500).send({
          error: "Erro ao buscar questões."
        });
      }
    }
  );


};