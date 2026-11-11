
import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";

import {
  login,
  getAuthenticatedUser,
  InvalidCredentialsError,
  AuthUserNotFoundError,
} from "./auth.service.js";

import type { LoginInput } from "./auth.types.js";

function handleError(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof InvalidCredentialsError) {
    return reply.code(401).send({
      message: error.message,
    });
  }

  if (error instanceof AuthUserNotFoundError) {
    return reply.code(404).send({
      message: error.message,
    });
  }

  request.log.error(
    { err: error },
    "Erro no módulo de autenticação",
  );

  return reply.code(500).send({
    message: "Ocorreu um erro interno.",
  });
}

export const authRoutes: FastifyPluginAsync = async (app) => {

  // LOGIN
  app.post<{ Body: LoginInput }>(
    "/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          additionalProperties: false,
          properties: {
            email: {
              type: "string",
              format: "email",
              maxLength: 254,
            },
            password: {
              type: "string",
              minLength: 8,
              maxLength: 128,
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await login(app, request.body);

        return reply.code(200).send(result);
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );

  // USUÁRIO AUTENTICADO
  app.get(
    "/me",
    {
      preHandler: async (request) => {
        await request.jwtVerify();
      },
    },
    async (request, reply) => {
      try {
        const user = await getAuthenticatedUser(
          request.user.sub,
        );

        return reply.send({
          user,
        });
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );
};
