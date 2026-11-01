// App, has the responsability to have the plugins and routes

import { GoogleGenAI } from "@google/genai";
import Fastify from "fastify";
import userPlugin from "./modules/user/user.plugin.js";
import multipart from "@fastify/multipart";
import { uploadRoutes } from "./modules/uploads/uploads.routes.js";
import { aiRoutes } from "./modules/ai/ai.routes.js";
import { testPlugin } from "./modules/questions/test.api.js";
import { questionsRoutes } from "./modules/questions/questions.routes.js";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastifySwagger from "@fastify/swagger";

const apiKey = process.env.GEMINI_API_KEY;


export function buildApp() {

    if (!apiKey) {
        throw new Error("GEMINI KEY não configurado no .env");
    }

    const ai = new GoogleGenAI({ apiKey });

    const fastify = Fastify({
        logger: true,
    });

        fastify.register(fastifySwagger, {
  openapi: {
    info: {
      title: "TCC API",
      description: "API da plataforma de estudos para concursos.",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Servidor local",
      },
    ],
  },
});

    // Registra o suporte a multipart
    fastify.register(multipart, {
        limits: {
            files: 1,
            fileSize: 10 * 1024 * 1024, // 10 MB
        },
    });

    // registring user's plugin
    fastify.register(userPlugin);

    // Geting upload
    fastify.register(uploadRoutes);

    // Making AI Route
    fastify.register(aiRoutes);

    // Making test api
    // Old api to test
    // fastify.register(testPlugin);

    // Geting questions
    fastify.register(questionsRoutes, {
        prefix: "/questions",
    });

    // Initial Route
    fastify.get("/test", async (_request, reply) => {
        try {
            const interaction = await ai.interactions.create({
                model: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
                input: "Me explique como a IA funciona em poucas palavras",
            });

            return {
                response: interaction.output_text,
            }
        }
        catch (error) {
            fastify.log.error(
                { err: error },
                "Erro ao se comunicar com a IA"
            );

            return reply.code(502).send({
                error: "Erro ao se comunicar com a IA",
            });
        }
    });

    fastify.get("/app/test", () => {
        return { Funcionando: "Agora sim!!" }
    })

    fastify.get("/", async (request, reply) => {
        reply.type('text/html');
        // Retorna a string HTML
        return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Minha Página Fastify</title>
    </head>
    <body>
      <h1>Olá do Fastify!</h1>
      <p>Esta página foi retornada usando request e reply.</p>
    </body>
    </html>
  `;
    })



fastify.register(fastifySwaggerUi, {
  routePrefix: "/docs",
});

    return fastify;
};