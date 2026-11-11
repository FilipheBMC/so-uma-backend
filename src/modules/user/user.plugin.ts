import type { FastifyPluginAsync } from "fastify";
import { userRoutes } from "./user.routes.js";

const userPlugin: FastifyPluginAsync = async (app) => {
  app.register(userRoutes, {
    prefix: "/users",
  });
};

export default userPlugin;
