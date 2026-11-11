
import argon2 from "argon2";
import type { FastifyInstance } from "fastify";

import { userRepository } from "../user/user.repository.js";

import type {
  LoginInput,
  AuthenticatedUser,
} from "./auth.types.js";

export class InvalidCredentialsError extends Error {}

export class AuthUserNotFoundError extends Error {}

export async function login(
  app: FastifyInstance,
  input: LoginInput,
) {
  const email = input.email.trim().toLowerCase();

  // Busca o usuário pelo e-mail
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new InvalidCredentialsError(
      "E-mail ou senha inválidos.",
    );
  }

  // Verifica a senha informada com o hash armazenado
  const passwordMatches = await argon2.verify(
    user.password_hash,
    input.password,
  );

  if (!passwordMatches) {
    throw new InvalidCredentialsError(
      "E-mail ou senha inválidos.",
    );
  }

  // Gera o JWT
  const token = app.jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
  );

  // Retorna apenas informações públicas
  const authenticatedUser: AuthenticatedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
  };

  return {
    user: authenticatedUser,
    token,
  };
}

export async function getAuthenticatedUser(id: string) {
  const user = await userRepository.findById(id);

  if (!user) {
    throw new AuthUserNotFoundError(
      "Usuário não encontrado.",
    );
  }

  return user;
}
