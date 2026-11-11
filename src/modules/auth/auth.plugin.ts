import type { FastifyPluginAsync } from "fastify";
import { authRoutes } from "./auth.routes.js";

const authPlugin: FastifyPluginAsync = async (app) => {
  app.register(authRoutes);
};

export default authPlugin;
