// import argon2 from "argon2";
// import { prisma } from "../lib/prisma.js";

// export class EmailAlreadyExistsError extends Error {
//   constructor() {
//     super("Este e-mail já está cadastrado.");
//     this.name = "EmailAlreadyExistsError";
//   }
// }

// function isUniqueConstraintError(error: unknown): boolean {
//   return (
//     typeof error === "object" &&
//     error !== null &&
//     "code" in error &&
//     error.code === "P2002"
//   );
// }

// type CreateUserInput = {
//   name: string;
//   email: string;
//   password: string;
// };

// export async function createUser(input: CreateUserInput) {
//   const name = input.name.trim();
//   const email = input.email.trim().toLowerCase();

//   if (!name) {
//     throw new Error("O nome é obrigatório.");
//   }

//   const passwordHash = await argon2.hash(input.password, {
//     type: argon2.argon2id,
//   });

//   try {
//     return await prisma.users.create({
//       data: {
//         name,
//         email,
//         password_hash: passwordHash,
//       },
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         created_at: true,
//       },
//     });
//   } catch (error) {
//     if (isUniqueConstraintError(error)) {
//       throw new EmailAlreadyExistsError();
//     }

//     throw error;
//   }
// }


import argon2 from "argon2";
import {
  userRepository,
  type UpdateUserData,
} from "./user.repository.js";

function isPrismaErrorCode(
  error: unknown,
  code: string,
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export class UserNotFoundError extends Error {}
export class UserAlreadyExistsError extends Error {}
export class InvalidUserDataError extends Error {}
export class UserDeleteConflictError extends Error {}

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
};

export async function createUser(input: CreateUserInput) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (!name) {
    throw new InvalidUserDataError(
      "O nome é obrigatório.",
    );
  }

  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
  });

  try {
    return await userRepository.create({
      name,
      email,
      password_hash: passwordHash,
    });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      throw new UserAlreadyExistsError(
        "Este e-mail já está cadastrado.",
      );
    }

    throw error;
  }
}

export async function listUsers(
  page: number,
  limit: number,
) {
  const skip = (page - 1) * limit;

  return userRepository.findAll(skip, limit);
}

export async function getUserById(id: string) {
  const user = await userRepository.findById(id);

  if (!user) {
    throw new UserNotFoundError(
      "Usuário não encontrado.",
    );
  }

  return user;
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
) {
  const data: UpdateUserData = {};

  if (input.name !== undefined) {
    const name = input.name.trim();

    if (!name) {
      throw new InvalidUserDataError(
        "O nome não pode ficar vazio.",
      );
    }

    data.name = name;
  }

  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();

    if (!email) {
      throw new InvalidUserDataError(
        "O e-mail não pode ficar vazio.",
      );
    }

    data.email = email;
  }

  if (Object.keys(data).length === 0) {
    throw new InvalidUserDataError(
      "Informe pelo menos um campo para atualizar.",
    );
  }

  try {
    return await userRepository.update(id, data);
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      throw new UserAlreadyExistsError(
        "Este e-mail já está cadastrado.",
      );
    }

    if (isPrismaErrorCode(error, "P2025")) {
      throw new UserNotFoundError(
        "Usuário não encontrado.",
      );
    }

    throw error;
  }
}

export async function deleteUser(id: string) {
  try {
    return await userRepository.delete(id);
  } catch (error) {
    if (isPrismaErrorCode(error, "P2025")) {
      throw new UserNotFoundError(
        "Usuário não encontrado.",
      );
    }

    if (isPrismaErrorCode(error, "P2003")) {
      throw new UserDeleteConflictError(
        "Não foi possível excluir o usuário devido a registros relacionados.",
      );
    }

    throw error;
  }
}
