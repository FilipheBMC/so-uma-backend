// // import { questionService } from "../questions/questions.service.js";
// // import type { StudyOrchestratorInput } from "./study-preparation.types.js";
// // import { organizer } from "./study.organaizer.js";

// // export async function studyOrchestror(input: StudyOrchestratorInput) {
// //     const dataOrganized = organizer(input);
// //     const questions = await questionService(dataOrganized);
// //     // Criar um verificador de respostas anteriores.
// //     return {
// //         ...dataOrganized,
// //         questions: questions.results,
// //         notifications: questions.notifications,
// //     };

// // }


// import { questionService } from "../questions/questions.service.js";
// import type { QuestionResearcher } from "../questions/question.interface.js";

// import {
//     matchSubjectAndTopics,
// } from "../semantic-matching/semantic-matching.service.js";

// import type {
//     SemanticMatchingResult,
// } from "../semantic-matching/semantic-matching.service.js";

// import type { StudyOrchestratorInput } from "./study-preparation.types.js";
// import { organizer } from "./study.organaizer.js";

// export async function studyOrchestror(input: StudyOrchestratorInput) {

//     // 1. Organiza as matérias e os assuntos recebidos.
//     const dataOrganized = organizer(input);

//     // 2. Estruturas utilizadas durante a preparação.
//     const subjectsForQuestions: QuestionResearcher["subjects"] = [];

//     const semanticMatches: SemanticMatchingResult[] = [];

//     const semanticNotifications: string[] = [];

//     // 3. Processa cada matéria individualmente.
//     // Mantemos a execução sequencial para controlar as chamadas à IA.

//     for (const subject of dataOrganized.subjects) {

//         // Os formatos antigos do organizador podem não possuir topics.
//         const originalTopics: string[] =
//             "topics" in subject && Array.isArray(subject.topics)
//                 ? subject.topics
//                     .filter((topic): topic is string => typeof topic === "string")
//                     .map((topic) => topic.trim())
//                     .filter(Boolean)
//                 : [];

//         // Não gastamos chamadas à IA com matérias sem questões reservadas.
//         if (
//             subject.amount === null ||
//             !Number.isInteger(subject.amount) ||
//             subject.amount <= 0
//         ) {
//             subjectsForQuestions.push({
//                 name: subject.name,
//                 amount: subject.amount,
//                 topics: originalTopics,
//             });

//             continue;
//         }

//         try {

//             // 4. Executa a correspondência semântica.
//             const semanticResult = await matchSubjectAndTopics({
//                 materia: subject.name,
//                 topics: originalTopics,
//             });

//             semanticMatches.push(semanticResult);

//             // 5. Utiliza a matéria encontrada no catálogo.
//             // Caso não exista correspondência, preserva o nome original.

//             const resolvedSubjectName =
//                 semanticResult.subjectMatch.status === "MATCHED" &&
//                 semanticResult.subjectMatch.catalogName
//                     ? semanticResult.subjectMatch.catalogName
//                     : subject.name;

//             // 6. Substitui somente os assuntos que possuem correspondência.
//             // Assuntos sem correspondência continuam com o nome original.

//             const resolvedTopics = semanticResult.topics.map((topic) => {

//                 if (
//                     topic.status === "MATCHED" &&
//                     topic.catalogName
//                 ) {
//                     return topic.catalogName;
//                 }

//                 return topic.originalName;
//             });

//             // 7. Registra notificações de correspondências não encontradas.

//             if (semanticResult.subjectMatch.status === "NO_MATCH") {

//                 semanticNotifications.push(
//                     `Não foi encontrada uma matéria equivalente para "${subject.name}". A busca continuará utilizando o nome original.`
//                 );

//             } else {

//                 for (const topic of semanticResult.topics) {

//                     if (topic.status === "NO_MATCH") {

//                         semanticNotifications.push(
//                             `Não foi encontrado um assunto equivalente para "${topic.originalName}" em "${subject.name}". A busca continuará utilizando o nome original.`
//                         );
//                     }
//                 }
//             }

//             // 8. Prepara os dados para o serviço de questões.
//             // A quantidade original permanece preservada.

//             subjectsForQuestions.push({
//                 name: resolvedSubjectName,
//                 amount: subject.amount,
//                 topics: resolvedTopics,
//             });

//             console.log("\nMatéria preparada para busca:");
//             console.log(`Original: ${subject.name}`);
//             console.log(`Quest API: ${resolvedSubjectName}`);

//         } catch (error) {

//             // Uma falha na análise semântica não deve impedir
//             // o usuário de tentar gerar seu simulado.

//             const message =
//                 error instanceof Error
//                     ? error.message
//                     : String(error);

//             console.error(
//                 `Erro na correspondência semântica de ${subject.name}:`,
//                 message,
//             );

//             semanticNotifications.push(
//                 `Não foi possível realizar a análise semântica de "${subject.name}". A busca continuará utilizando os nomes originais.`
//             );

//             // Fallback: preserva os dados originais.

//             subjectsForQuestions.push({
//                 name: subject.name,
//                 amount: subject.amount,
//                 topics: originalTopics,
//             });
//         }
//     }

//     // 9. Envia as matérias já preparadas para a Quest API.
//     const questions = await questionService({
//         subjects: subjectsForQuestions,
//     });

//     // 10. Retorna os resultados e as informações semânticas.
//     return {
//         ...dataOrganized,

//         semanticMatches,

//         questions: questions.results,

//         notifications: [
//             ...semanticNotifications,
//             ...questions.notifications,
//         ],
//     };
// }


import { questionService } from "../questions/questions.service.js";
import type { QuestionResearcher } from "../questions/question.interface.js";

import {
    matchSubjectAndTopics,
} from "../semantic-matching/semantic-matching.service.js";

import type {
    SemanticMatchingResult,
} from "../semantic-matching/semantic-matching.service.js";

import type {
    ResolvedStudySubject,
    ResolvedStudyTopic,
    StudyOrchestratorInput,
} from "./study-preparation.types.js";

import { organizer } from "./study.organaizer.js";

export async function studyOrchestror(input: StudyOrchestratorInput) {

    // 1. Organiza os dados originais recebidos.
    const dataOrganized = organizer(input);

    // 2. Prepara as estruturas do processamento.
    const subjectsForQuestions: QuestionResearcher["subjects"] = [];

    const semanticMatches: SemanticMatchingResult[] = [];

    const resolvedSubjects: ResolvedStudySubject[] = [];

    const semanticNotifications: string[] = [];

    // 3. Processa cada matéria individualmente.
    for (const subject of dataOrganized.subjects) {

        const originalTopics: string[] =
            "topics" in subject && Array.isArray(subject.topics)
                ? subject.topics
                    .filter((topic): topic is string =>
                        typeof topic === "string"
                    )
                    .map((topic) => topic.trim())
                    .filter(Boolean)
                : [];

        // 4. Não realiza análise semântica quando não há
        // uma quantidade válida de questões reservadas.

        if (
            subject.amount === null ||
            !Number.isInteger(subject.amount) ||
            subject.amount <= 0
        ) {

            subjectsForQuestions.push({
                name: subject.name,
                amount: subject.amount,
                topics: originalTopics,
            });

            resolvedSubjects.push({
                originalName: subject.name,
                resolvedName: subject.name,
                amount: subject.amount,
                status: "NOT_ANALYZED",
                catalogId: null,
                confidence: null,
                reason: "Matéria não analisada semanticamente por não possuir uma quantidade válida de questões.",
                topics: originalTopics.map((topic) => ({
                    originalName: topic,
                    resolvedName: topic,
                    status: "NOT_ANALYZED",
                    catalogId: null,
                    catalogSubjectId: null,
                    confidence: null,
                    reason: null,
                })),
            });

            continue;
        }

        try {

            // 5. Executa a correspondência semântica.
            const semanticResult = await matchSubjectAndTopics({
                materia: subject.name,
                topics: originalTopics,
            });

            semanticMatches.push(semanticResult);

            const subjectMatch = semanticResult.subjectMatch;

            // 6. Resolve o nome da matéria.
            const resolvedSubjectName =
                subjectMatch.status === "MATCHED" &&
                subjectMatch.catalogName
                    ? subjectMatch.catalogName
                    : subject.name;

            // 7. Monta a relação entre assuntos originais
            // e assuntos reconhecidos no catálogo.

            const resolvedTopics: ResolvedStudyTopic[] =
                semanticResult.topics.map((topic) => {

                    const matched =
                        topic.status === "MATCHED" &&
                        topic.catalogName !== null;

                    return {
                        originalName: topic.originalName,

                        resolvedName: matched
                            ? topic.catalogName!
                            : topic.originalName,

                        status: topic.status,

                        catalogId: topic.catalogId,

                        catalogSubjectId: topic.catalogSubjectId,

                        confidence: topic.confidence,

                        reason: topic.reason,
                    };
                });

            // 8. Gera notificações para os itens não encontrados.

            if (subjectMatch.status === "NO_MATCH") {
                semanticNotifications.push(
                    `Não foi encontrada uma matéria equivalente para "${subject.name}". A busca utilizará o nome original.`
                );
            } else {
                for (const topic of resolvedTopics) {
                    if (topic.status === "NO_MATCH") {
                        semanticNotifications.push(
                            `Não foi encontrado um assunto equivalente para "${topic.originalName}" em "${subject.name}". A busca utilizará o nome original.`
                        );
                    }
                }
            }

            // 9. Guarda a representação resolvida.
            resolvedSubjects.push({
                originalName: subject.name,
                resolvedName: resolvedSubjectName,
                amount: subject.amount,
                status: subjectMatch.status,
                catalogId: subjectMatch.catalogId,
                confidence: subjectMatch.confidence,
                reason: subjectMatch.reason,
                topics: resolvedTopics,
            });

            // 10. Prepara os nomes reconhecidos para a Quest API.

            const resolvedTopicNames = resolvedTopics.map(
                (topic) => topic.resolvedName
            );

            subjectsForQuestions.push({
                name: resolvedSubjectName,
                amount: subject.amount,
                topics: resolvedTopicNames,
            });

            console.log("\nMatéria preparada para busca:");
            console.log(`Original: ${subject.name}`);
            console.log(`Quest API: ${resolvedSubjectName}`);

            console.log("Assuntos preparados:");

            for (const topic of resolvedTopics) {
                console.log(
                    `${topic.originalName} -> ${topic.resolvedName}`
                );
            }

        } catch (error) {

            // 11. Fallback: caso a análise semântica falhe,
            // preservamos os nomes originais.

            const message =
                error instanceof Error
                    ? error.message
                    : String(error);

            console.error(
                `Erro na correspondência semântica de ${subject.name}:`,
                message,
            );

            semanticNotifications.push(
                `Não foi possível realizar a análise semântica de "${subject.name}". A busca continuará utilizando os nomes originais.`
            );

            subjectsForQuestions.push({
                name: subject.name,
                amount: subject.amount,
                topics: originalTopics,
            });

            resolvedSubjects.push({
                originalName: subject.name,
                resolvedName: subject.name,
                amount: subject.amount,
                status: "ERROR_FALLBACK",
                catalogId: null,
                confidence: null,
                reason: message,
                topics: originalTopics.map((topic) => ({
                    originalName: topic,
                    resolvedName: topic,
                    status: "ERROR_FALLBACK",
                    catalogId: null,
                    catalogSubjectId: null,
                    confidence: null,
                    reason: message,
                })),
            });
        }
    }

    // 12. Consulta a Quest API com os dados resolvidos.
    const questions = await questionService({
        subjects: subjectsForQuestions,
    });

    // 13. Retorna dados originais, dados resolvidos,
    // correspondências semânticas e questões.

    return {
        ...dataOrganized,

        resolvedSubjects,

        semanticMatches,

        questions: questions.results,

        notifications: [
            ...semanticNotifications,
            ...questions.notifications,
        ],
    };
}
