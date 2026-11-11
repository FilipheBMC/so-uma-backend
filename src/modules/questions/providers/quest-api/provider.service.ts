import type { QuestionResearcher, QuestionResearcherQuestion } from "../../question.interface.js";
import type { QuestApiQuestionFilters } from "./interfaces/questao.interface.js";
import type { QuestApiResponse } from "./interfaces/questions.interface.js";

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

// export async function questionGetter(data: QuestionResearcherQuestion) {
//     const params = new URLSearchParams();

//     params.set("per_page", String(data.amount));
//     params.set("materia", data.subject);
//     params.set("include_gabarito", "true");
//     params.set("page", "1");

//     const url = `${link!.replace(/\/+$/, "")}/questoes?${params.toString()}`;

//     if (!apiKey) {
//         throw new Error("DB_QUEST não configurada no .env");
//     }

//     const response = await fetch(url, {
//         method: "GET",
//         headers: {
//             "X-API-Key": apiKey,
//             Accept: "application/json",
//         },
//     });

//     if (!response.ok) {
//         throw new Error(`QuestAPI retornou HTTP ${response.status}`);
//     }

//     return await response.json();
// }

export async function questionGetter(data: QuestionResearcherQuestion): Promise<QuestApiResponse> {
    if (!link) {
        throw new Error("URL da QuestAPI não configurada.");
    }

    if (!apiKey) {
        throw new Error("DB_QUEST não configurada no .env.");
    }

    const params = new URLSearchParams();

    params.set("per_page", String(data.amount));
    params.set("materia", data.subject);
    params.set("include_gabarito", "true");
    params.set("page", "1");

    const url = `${link.replace(/\/+$/, "")}/questoes?${params.toString()}`;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "X-API-Key": apiKey,
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`QuestAPI retornou HTTP ${response.status}`);
    }


    const result = await response.json();

    return result as QuestApiResponse;
}