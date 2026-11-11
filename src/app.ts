// App, has the responsability to have the plugins and routes
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";

import Fastify from "fastify";
import userPlugin from "./modules/user/user.plugin.js";
import multipart from "@fastify/multipart";
import { questionsRoutes } from "./modules/questions/questions.routes.js";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastifySwagger from "@fastify/swagger";
import { pdfAnalysis } from "./modules/edital-analysis/edital-analysis.routes.js";
import authPlugin from "./modules/auth/auth.plugin.js";
import questApiLabRoutes from "./modules/quest-api-lab/quest-api-routes.js";



export function buildApp() {

    // Verificando chaves JWT e CORS
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret)
        throw new Error("JWT_SECRET não configurado ou muito curto.");

    const frontendUrl =
        process.env.FRONTEND_URL ?? "http://localhost:5173";
    //--------------------------------------------------------------- 

    const fastify = Fastify({
        logger: true,
    });

    // Configurando CORS para permitir comunicaçãocom front-end

    fastify.register(cors, {
        origin: frontendUrl,
         methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })

    // JWT: autenticação e validação de tokens
    fastify.register(jwt, {
        secret: jwtSecret,
        sign: {
            expiresIn: "12h",
        },
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

    // ----------------- ROTA DE TESTE -----------------

    fastify.register(questApiLabRoutes, {
        prefix: "/quest-api-lab"
    });


    // -------------------------------------------------

    // Registrando auth
    fastify.register(authPlugin, {
        prefix: "/auth"
    })

    // registring user's plugin
    fastify.register(userPlugin);

    // Geting questions
    fastify.register(questionsRoutes, {
        prefix: "/questions",
    });

    // Novo registro, pdf-analysis
    fastify.register(pdfAnalysis, {
        prefix: "/editais"
    })

    fastify.register(fastifySwaggerUi, {
        routePrefix: "/docs",
    });

    return fastify;
};