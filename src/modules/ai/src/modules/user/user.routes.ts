
import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";

import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
  InvalidUserDataError,
  UserAlreadyExistsError,
  UserNotFoundError,
  UserDeleteConflictError,
  type CreateUserInput,
  type UpdateUserInput,
} from "./user.service.js";

type UserIdParams = {
  id: string;
};

type ListUsersQuery = {
  page?: number;
  limit?: number;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function handleError(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof InvalidUserDataError) {
    return reply.code(400).send({
      message: error.message,
    });
  }

  if (error instanceof UserAlreadyExistsError) {
    return reply.code(409).send({
      message: error.message,
    });
  }

  if (error instanceof UserNotFoundError) {
    return reply.code(404).send({
      message: error.message,
    });
  }

  if (error instanceof UserDeleteConflictError) {
    return reply.code(409).send({
      message: error.message,
    });
  }

  request.log.error(
    { err: error },
    "Erro ao processar operação de usuário",
  );

  return reply.code(500).send({
    message: "Ocorreu um erro interno.",
  });
}

export const userRoutes: FastifyPluginAsync = async (app) => {
  // CREATE: cadastrar usuário
  app.post<{ Body: CreateUserInput }>(
    "/",
    {
      schema: {
        body: {
          type: "object",
          required: ["name", "email", "password"],
          additionalProperties: false,
          properties: {
            name: {
              type: "string",
              minLength: 2,
              maxLength: 120,
            },
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
        const user = await createUser(request.body);

        return reply.code(201).send(user);
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );

  // READ: listar usuários (somente para testes locais)
  app.get<{ Querystring: ListUsersQuery }>(
    "/",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            page: {
              type: "integer",
              minimum: 1,
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 50,
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const page = request.query.page ?? 1;
      const limit = request.query.limit ?? 20;

      try {
        const users = await listUsers(page, limit);

        return {
          data: users,
          pagination: {
            page,
            limit,
            returned: users.length,
          },
        };
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );

  // READ: consultar um usuário por ID
  app.get<{ Params: UserIdParams }>(
    "/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const user = await getUserById(request.params.id);

        return reply.send(user);
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );

  // UPDATE: atualizar nome e/ou e-mail
  app.patch<{
    Params: UserIdParams;
    Body: UpdateUserInput;
  }>(
    "/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
          },
        },
        body: {
          type: "object",
          minProperties: 1,
          additionalProperties: false,
          properties: {
            name: {
              type: "string",
              minLength: 2,
              maxLength: 120,
            },
            email: {
              type: "string",
              format: "email",
              maxLength: 254,
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const user = await updateUser(
          request.params.id,
          request.body,
        );

        return reply.send(user);
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );

  // DELETE: excluir usuário
  app.delete<{ Params: UserIdParams }>(
    "/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        await deleteUser(request.params.id);

        return reply.code(204).send();
      } catch (error) {
        return handleError(error, request, reply);
      }
    },
  );
};
