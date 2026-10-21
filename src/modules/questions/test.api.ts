import type { FastifyPluginAsync } from "fastify";

export const testPlugin: FastifyPluginAsync = async (app) => {
    app.get("/api-test", async (_resquest, reply) => {
        const apiKey = process.env.DB_QUEST;
        if (!apiKey) {
            app.log.error("DB_QUEST não foi configurada");
            return reply.code(500).send({
                message: "A chave da QuestAPI não está configurada."
            });
        }
        const url = new URL(
            "https://api.quest.api.br/v2/questoes",
        );

        url.searchParams.set("materia", "Direito Constitucional");
        url.searchParams.set("ano", "2025");
        url.searchParams.set("page", "1");
        url.searchParams.set("per_page", "1");

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "X-API-Key": apiKey,
                    Accept: "application/json",
                },
                signal: AbortSignal.timeout(10_000),
            });

            if (!response.ok) {
                app.log.error(
                    { statusCode: response.status },
                    "Erro na consulta à QuestAPI.",
                );

                return reply.code(502).send({
                    message: "A QuestAPI não conseguiu atender à consulta.",
                    providerStatus: response.status,
                });
            }

            const result: unknown = await response.json();

            return reply.code(200).send(result);
        } catch (error) {
            app.log.error(
                { err: error },
                "Falha ao conectar com a QuestAPI.",
            );

            return reply.code(502).send({
                message: "Não foi possível conectar à QuestAPI.",
            });
        }
    })
}