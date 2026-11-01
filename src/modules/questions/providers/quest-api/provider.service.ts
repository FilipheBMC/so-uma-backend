import type { QuestApiQuestionFilters } from "./interfaces/questao.interface.js";

const apiKey = process.env.DB_QUEST;
const link = process.env.LINK_API_QUEST?.toString();

if (!apiKey) {
    throw new Error("DB_QUEST não configurada no .env");
}

// Lembrar que sempre tem de validar porque o Typescript é chato com isso.
if (!link) {
    throw new Error("LINK_API_QUEST não configurada no .env");
}


export const getQuestions = async (
    filters: Pick<
        QuestApiQuestionFilters,
        "banca" | "ano" | "materia" | "assunto" | "page" | "per_page"
    >
) => {

    const params = new URLSearchParams();

    if (filters.banca) params.set("banca", filters.banca);
    if (filters.ano) params.set("ano", filters.ano);
    if (filters.materia) params.set("materia", filters.materia);
    if (filters.assunto) params.set("assunto", filters.assunto);

    params.set("page", String(filters.page ?? 1));
    params.set("per_page", String(filters.per_page ?? 5));

    params.set("include_gabarito", "true");

    const url = `${link.replace(/\/+$/, "")}/questoes?${params.toString()}`;

    console.log("URL GERADA:", url);

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "X-API-Key": apiKey,
            "Accept": "application/json"
        }
    });

    if (!response.ok) {
        const errorBody = await response.text();

        throw new Error(
            `Erro na Quest API: ${response.status} - ${errorBody}`
        );
    }

    return await response.json();
    // SOMENTE TESTE
    // Retorna os dados para testar, sem fazer fetch.
    // return {
    //     filtrosRecebidos: filters,
    //     parametrosGerados: Object.fromEntries(params.entries()),
    //     urlGerada: url
    // };
};
