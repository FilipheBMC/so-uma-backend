// App, has the responsability to have the plugins and routes

import { GoogleGenAI } from "@google/genai";
import Fastify from "fastify";
import userPlugin from "./modules/user/user.plugin.js";
import multipart from "@fastify/multipart";
import { questionsRoutes } from "./modules/questions/questions.routes.js";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastifySwagger from "@fastify/swagger";
import { analyzePdf, analyzeText, INPUT } from "./modules/ai/ai.service.js";
import { pdfAnalysis } from "./modules/edital-analysis/edital-analysis.routes.js";


//  Excluir depois
type QuestaoQuery = {
    banca?: string;
    materia?: string;
    assunto?: string;
    codigo?: string;
    ano?: string;
    dificuldade?: string;
    page?: string;
    per_page?: string;
    tem_gabarito?: string;
    include_gabarito?: string;
};
// -----------------------------------

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
    // fastify.register(uploadRoutes);

    // Making test api
    // Old api to test
    // fastify.register(testPlugin);

    // Geting questions
    fastify.register(questionsRoutes, {
        prefix: "/questions",
    });

    // Novo registro, pdf-analysis
    fastify.register(pdfAnalysis, {
        prefix: "/editais"
    })

    fastify.get("/other", async (_request, reply) => {
        const result = await analyzeText(INPUT);

        return reply.status(200).send({
            message: "Análise textual concluída.",
            data: result,
        });
    });

    // **************************************** --- ****************************************

  
fastify.get("/apiQuestao/assuntos", async (request, reply) => {
    try {
        const response = await fetch(
            "https://api.quest.api.br/v2/filtros/assuntos?materia=Direito%20Administrativo&q=licita&per_page=20",
            {
                method: "GET",
                headers: {
                    "X-API-Key": "qk_d2b9a725795815a113eb39ea9c39a35acdcf022f9c842a29",
                },
            }
        );

        if (!response.ok) {
            const errorBody = await response.text();

            request.log.error({
                status: response.status,
                body: errorBody,
            });

            return reply.code(response.status).send({
                error: "Erro ao buscar assuntos",
            });
        }

        const { data } = await response.json();

        console.log(data);

        return reply.send(data);

    } catch (error) {
        request.log.error(error);

        return reply.code(500).send({
            error: "Erro interno ao consultar assuntos",
        });
    }
});

fastify.get<{ Querystring: QuestaoQuery }>(
    "/apiQuestao/questoes",
    async (request, reply) => {
        try {
            const {
                banca,
                materia,
                assunto,
                codigo,
                ano,
                dificuldade,
                page = "1",
                per_page = "5",
                tem_gabarito,
                include_gabarito = true,
            } = request.query;

            // Validar paginação
            const pageNumber = Number(page);
            const perPageNumber = Number(per_page);

            if (
                !Number.isInteger(pageNumber) ||
                pageNumber < 1 ||
                !Number.isInteger(perPageNumber) ||
                perPageNumber < 1 ||
                perPageNumber > 100
            ) {
                return reply.code(400).send({
                    error: "Parâmetros de paginação inválidos."
                });
            }

            // Montar parâmetros da Quest API
            const params = new URLSearchParams();

            if (banca) params.set("banca", banca);
            if (materia) params.set("materia", materia);
            if (assunto) params.set("assunto", assunto);
            if (codigo) params.set("codigo", codigo);
            if (ano) params.set("ano", ano);

            if (dificuldade) {
                const difficultyNumber = Number(dificuldade);

                if (!Number.isInteger(difficultyNumber)) {
                    return reply.code(400).send({
                        error: "Dificuldade inválida."
                    });
                }

                params.set("dificuldade", dificuldade);
            }

            if (tem_gabarito !== undefined) {
                params.set("tem_gabarito", tem_gabarito);
            }

            //Fazendo o gabarito sempre ser true quando houver
            if (include_gabarito !== undefined) {
                params.set("include_gabarito", "true");
            }

            params.set("page", String(pageNumber));
            params.set("per_page", String(perPageNumber));

            // Consultar Quest API
            const response = await fetch(
                `https://api.quest.api.br/v2/questoes?${params.toString()}`,
                {
                    method: "GET",
                    headers: {
                        "X-API-Key": "qk_d2b9a725795815a113eb39ea9c39a35acdcf022f9c842a29",
                    },
                }
            );

            if (!response.ok) {
                const errorBody = await response.text();

                request.log.error({
                    status: response.status,
                    body: errorBody,
                });

                return reply.code(response.status).send({
                    error: "Erro ao consultar questões."
                });
            }

            const result = await response.json();

            return reply.send(result);

        } catch (error) {
            request.log.error(error);

            return reply.code(500).send({
                error: "Erro interno ao buscar questões."
            });
        }
    }
);

    //********************************************************************************* */

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