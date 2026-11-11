
// import { prisma } from "../../lib/prisma.js";

// const publicUserSelect = {
//   id: true,
//   name: true,
//   email: true,
//   created_at: true,
// } as const;

// export type CreateUserData = {
//   name: string;
//   email: string;
//   password_hash: string;
// };

// export type UpdateUserData = {
//   name?: string;
//   email?: string;
// };

// export const userRepository = {
//   create(data: CreateUserData) {
//     return prisma.users.create({
//       data,
//       select: publicUserSelect,
//     });
//   },

//   findAll(skip: number, take: number) {
//     return prisma.users.findMany({
//       skip,
//       take,
//       orderBy: {
//         created_at: "desc",
//       },
//       select: publicUserSelect,
//     });
//   },

//   findById(id: string) {
//     return prisma.users.findUnique({
//       where: { id },
//       select: publicUserSelect,
//     });
//   },

//   update(id: string, data: UpdateUserData) {
//     return prisma.users.update({
//       where: { id },
//       data,
//       select: publicUserSelect,
//     });
//   },

//   delete(id: string) {
//     return prisma.users.delete({
//       where: { id },
//       select: { id: true },
//     });
//   },
// };


import { prisma } from "../../lib/prisma.js";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  created_at: true,
} as const;

export type CreateUserData = {
  name: string;
  email: string;
  password_hash: string;
};

export type UpdateUserData = {
  name?: string;
  email?: string;
};

export const userRepository = {
  create(data: CreateUserData) {
    return prisma.users.create({
      data,
      select: publicUserSelect,
    });
  },

  findAll(skip: number, take: number) {
    return prisma.users.findMany({
      skip,
      take,
      orderBy: {
        created_at: "desc",
      },
      select: publicUserSelect,
    });
  },

  findById(id: string) {
    return prisma.users.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  },

  // Consulta privada para autenticação
  findByEmail(email: string) {
    return prisma.users.findUnique({
      where: { email },
      select: {
        ...publicUserSelect,
        password_hash: true,
      },
    });
  },

  update(id: string, data: UpdateUserData) {
    return prisma.users.update({
      where: { id },
      data,
      select: publicUserSelect,
    });
  },

  delete(id: string) {
    return prisma.users.delete({
      where: { id },
      select: { id: true },
    });
  },
};
