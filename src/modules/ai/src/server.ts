// import Fastify from "fastify";
import "dotenv/config";
// import { GoogleGenAI } from "@google/genai";
// import userPlugin from "./user/user.plugin.js";

import { buildApp } from "./app.js";

// const PORT = Number(process.env.PORT ?? 3000);
// const apiKey = process.env.GEMINI_API_KEY;

// if (!apiKey) {
//   throw new Error("GEMINI_API_KEY não configurada no .env");
// }

// // Inicializa o cliente da IA
// const ai = new GoogleGenAI({
//   apiKey,
// });

// const fastify = Fastify({
//   logger: true,
// });

// fastify.register(userPlugin);

// fastify.get("/", async () => {
//   return { hello: "mundo" };
// });

// // Rota de teste da IA
// // fastify.get("/test", async (_request, reply) => {
// //   try {
// //     const interaction = await ai.interactions.create({
// //       model: "gemini-3.8-flash",
// //       input: "Explain how AI works in a few words",
// //     });

// //     return {
// //       response: interaction.output_text,
// //     };
// //   } catch (error) {
// //     fastify.log.error(
// //       { err: error },
// //       "Erro ao se comunicar com a IA",
// //     );

// //     return reply.code(502).send({
// //       error: "Erro ao se comunicar com a IA",
// //     });
// //   }
// // });

// const start = async () => {
//   try {
//     await fastify.listen({
//       port: PORT,
//       host: "127.0.0.1",
//     });

//     console.log(
//       `Servidor rodando em http://localhost:${PORT}`,
//     );
//   } catch (error) {
//     fastify.log.error(error);
//     process.exit(1);
//   }
// };

// void start();


const PORT = Number(process.env.PORT ?? 3000);

const fastify = buildApp();

const start = async () => {
  try {
    await fastify.listen({
      port: PORT,
      host: "127.0.0.1",
    });

    fastify.log.info(
      `Servidor rodando em http://localhost${PORT}`
    );
  }
  catch (error) {
    fastify.log.error(error);
    process.exit(1);
  };
};

void start();