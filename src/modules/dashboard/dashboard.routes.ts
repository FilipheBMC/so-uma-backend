import type { FastifyPluginAsync } from "fastify";

import { authenticate } from "../auth/auth.middleware.js";
import { getDashboardStatistics } from "./dashboard.service.js";

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", authenticate);

  app.get("/statistics", async (request, reply) => {
    try {
      const statistics = await getDashboardStatistics(request.user.sub);
      return reply.code(200).send(statistics);
    } catch (error: unknown) {
      request.log.error({ err: error }, "Erro ao carregar estatísticas do dashboard");
      return reply.code(500).send({
        message: "Não foi possível carregar as estatísticas do dashboard.",
      });
    }
  });
};
