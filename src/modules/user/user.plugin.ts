// import type { FastifyPluginAsync } from "fastify";
// import fastify from "fastify";

// const userSchema = {

// }

// const userPlugin: FastifyPluginAsync = async (app) => {

//     app.get("/user", async () => {
//         return {
//             message: "Rota funcionando",
//             users: [],
//         }
//     });


//     app.get<{ Params: { id: number } }>("/user/:id", async (request) => {
//         const { id } = request.params;

//         return {
//             message: "Pegando usuário por ID",
//             userId: id,
//         };
//     });

// };

// export default userPlugin;


import type { FastifyPluginAsync } from "fastify";
import { userRoutes } from "./user.routes.js";

const userPlugin: FastifyPluginAsync = async (app) => {
  app.register(userRoutes, {
    prefix: "/users",
  });
};

export default userPlugin;
