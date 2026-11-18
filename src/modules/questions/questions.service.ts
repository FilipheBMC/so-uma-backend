import { getQuestionsProvider } from "./providers/index.js";
import type { QuestionServiceResult, QuestionSubjectResult } from "./providers/quest-api/interfaces/questions.interface.js";
import { questionGetter } from "./providers/quest-api/provider.service.js";
import { persistQuestQuestions } from "./question-persistence.service.js";
import type { QuestionResearcher } from "./question.interface.js";
import type { QuestionSearchFilters } from "./question.types.js";

// export async function searchQuestions(
//   filters: QuestionSearchFilters,
//   providerId = "quest-api",
// ) {
//   const provider = getQuestionsProvider(providerId);

//   return provider.search(filters);
// }

// export async function questionService(data: QuestionResearcher) {
//   const results: {
//     materia: string;
//     questions: unknown;
//   }[] = [];

//   const notifications: string[] = [];

//   for (const subject of data.subjects) {
//     if (subject.amount === null || subject.amount <= 0) {
//       continue;
//     }

//     try {
//       const questions = await questionGetter({
//         subject: subject.name,
//         amount: subject.amount,
//       });

//       results.push({
//         materia: subject.name,
//         questions,
//       });

//     } catch (error) {
//       console.error(
//         `Erro ao buscar questões de ${subject.name}:`,
//         error,
//       );

//       notifications.push(
//         `Não foi possível buscar questões de ${subject.name}.`,
//       );
//     }
//   }

//   return {
//     results,
//     notifications,
//   };
// }

// export async function questionService(
//   data: QuestionResearcher
// ): Promise<QuestionServiceResult> {

//   const results: QuestionSubjectResult[] = [];
//   const notifications: string[] = [];

//   for (const subject of data.subjects) {
//     if (subject.amount === null || subject.amount <= 0) {
//       continue;
//     }

//     try {
//       const questions = await questionGetter({
//         subject: subject.name,
//         amount: subject.amount,
//       });

//       results.push({
//         materia: subject.name,
//         questions,
//       });

//       if (questions.data.items.length === 0) {
//         notifications.push(
//           `Nenhuma questão encontrada para ${subject.name}.`
//         );
//       }

//     } catch (error) {
//       console.error(`Erro ao buscar ${subject.name}:`, error);

//       notifications.push(
//         `Não foi possível buscar questões de ${subject.name}.`
//       );
//     }
//   }

//   return {
//     results,
//     notifications,
//   };
// }


// export async function questionService(
//   data: QuestionResearcher
// ): Promise<QuestionServiceResult> {

//   const results: QuestionSubjectResult[] = [];
//   const notifications: string[] = [];

//   for (const subject of data.subjects) {

//     if (subject.amount === null) {
//       continue;
//     }

//     if (!Number.isInteger(subject.amount) || subject.amount <= 0) {
//       notifications.push(
//         `Quantidade inválida de questões para ${subject.name}.`
//       );
//       continue;
//     }

//     // Remove espaços desnecessários e assuntos duplicados.
//     const topics = Array.from(
//       new Set(
//         (subject.topics ?? [])
//           .map((topic) => topic.trim())
//           .filter(Boolean)
//       )
//     );

//     // Quando não existem assuntos, busca diretamente pela matéria.
//     const topicsToSearch: (string | undefined)[] =
//       topics.length > 0 ? topics : [undefined];

//     // Distribui a quantidade total entre os assuntos.
//     const distribution =
//       topics.length > 0
//         ? distributeQuestions(subject.amount, topics.length)
//         : [subject.amount];

//     for (let index = 0; index < topicsToSearch.length; index++) {

//       const topic = topicsToSearch[index];
//       const amount = distribution[index];

//       if (amount === undefined || amount <= 0) {
//         if (topic) {
//           notifications.push(
//             `Não foram reservadas questões para o assunto "${topic}" de ${subject.name}, pois a quantidade total é insuficiente para todos os assuntos.`
//           );
//         }

//         continue;
//       }

//       try {
//         const questions = await questionGetter({
//           subject: subject.name,
//           amount,
//           ...(topic ? { topic } : {}),
//         });

//         results.push({
//           materia: subject.name,
//           ...(topic ? { assunto: topic } : {}),
//           questions,
//         });

//         if (questions.data.items.length === 0) {
//           notifications.push(
//             topic
//               ? `Nenhuma questão encontrada para ${subject.name} — ${topic}.`
//               : `Nenhuma questão encontrada para ${subject.name}.`
//           );

//           continue;
//         }

//         // Persiste as questões retornadas pela Quest API.
//         try {
//           const persisted = await persistQuestQuestions(
//             questions.data.items
//           );

//           console.info("Questões persistidas:", {
//             materia: subject.name,
//             assunto: topic ?? null,
//             criadas: persisted.created,
//             atualizadas: persisted.updated,
//           });

//         } catch (error) {
//           console.error(
//             `Erro ao persistir questões de ${subject.name}${topic ? ` — ${topic}` : ""}:`,
//             error
//           );

//           notifications.push(
//             `As questões de ${subject.name}${topic ? ` — ${topic}` : ""} foram encontradas, mas não foi possível salvá-las no banco.`
//           );
//         }

//       } catch (error) {
//         console.error(
//           `Erro ao buscar questões de ${subject.name}${topic ? ` — ${topic}` : ""}:`,
//           error
//         );

//         notifications.push(
//           topic
//             ? `Não foi possível buscar questões de ${subject.name} — ${topic}.`
//             : `Não foi possível buscar questões de ${subject.name}.`
//         );
//       }
//     }
//   }

//   return {
//     results,
//     notifications,
//   };
// }


// // Distribui igualmente a quantidade de questões.
// function distributeQuestions(
//   total: number,
//   subjectCount: number,
// ): number[] {

//   const base = Math.floor(total / subjectCount);
//   const remainder = total % subjectCount;

//   return Array.from(
//     { length: subjectCount },
//     (_, index) => base + (index < remainder ? 1 : 0),
//   );
// }

type QuestionServiceWithPersistenceResult = QuestionServiceResult & {
  persistedQuestionIds: string[];
};

export async function searchQuestions(
  filters: QuestionSearchFilters,
  providerId = "quest-api",
) {
  const provider = getQuestionsProvider(providerId);
  return provider.search(filters);
}

export async function questionService(
  data: QuestionResearcher,
): Promise<QuestionServiceWithPersistenceResult> {
  const results: QuestionSubjectResult[] = [];
  const notifications: string[] = [];
  const persistedQuestionIds = new Set<string>();

  for (const subject of data.subjects) {
    if (subject.amount === null) {
      continue;
    }

    if (!Number.isInteger(subject.amount) || subject.amount <= 0) {
      notifications.push(
        `Quantidade inválida de questões para ${subject.name}.`,
      );
      continue;
    }

    const topics = Array.from(
      new Set(
        (subject.topics ?? [])
          .map((topic) => topic.trim())
          .filter(Boolean),
      ),
    );

    const topicsToSearch: (string | undefined)[] =
      topics.length > 0 ? topics : [undefined];

    const distribution =
      topics.length > 0
        ? distributeQuestions(subject.amount, topics.length)
        : [subject.amount];

    for (let index = 0; index < topicsToSearch.length; index++) {
      const topic = topicsToSearch[index];
      const amount = distribution[index];

      if (amount === undefined || amount <= 0) {
        if (topic) {
          notifications.push(
            `Não foram reservadas questões para o assunto "${topic}" de ${subject.name}, pois a quantidade total é insuficiente para todos os assuntos.`,
          );
        }
        continue;
      }

      try {
        const questions = await questionGetter({
          subject: subject.name,
          amount,
          ...(topic ? { topic } : {}),
        });

        results.push({
          materia: subject.name,
          questions,
        });

        if (questions.data.items.length === 0) {
          notifications.push(
            topic
              ? `Nenhuma questão encontrada para ${subject.name} — ${topic}.`
              : `Nenhuma questão encontrada para ${subject.name}.`,
          );
          continue;
        }

        // A busca continua disponível mesmo se a persistência falhar.
        try {
          const persisted = await persistQuestQuestions(questions.data.items);

          for (const item of persisted.questions) {
            persistedQuestionIds.add(item.questionId);
          }

          console.info(
            `Questões persistidas (${subject.name}${topic ? ` — ${topic}` : ""}):`,
            {
              criadas: persisted.created,
              atualizadas: persisted.updated,
              associáveisAoSimulado: persisted.questions.length,
            },
          );
        } catch (persistenceError) {
          console.error(
            `Erro ao persistir questões de ${subject.name}${topic ? ` — ${topic}` : ""}:`,
            persistenceError,
          );

          notifications.push(
            `As questões de ${subject.name}${topic ? ` — ${topic}` : ""} foram encontradas, mas não foi possível salvá-las no banco de dados.`,
          );
        }
      } catch (error) {
        console.error(
          `Erro ao buscar questões de ${subject.name}${topic ? ` — ${topic}` : ""}:`,
          error,
        );

        notifications.push(
          topic
            ? `Não foi possível buscar questões de ${subject.name} — ${topic}.`
            : `Não foi possível buscar questões de ${subject.name}.`,
        );
      }
    }
  }

  return {
    results,
    notifications,
    persistedQuestionIds: Array.from(persistedQuestionIds),
  };
}

function distributeQuestions(total: number, subjectCount: number): number[] {
  const base = Math.floor(total / subjectCount);
  const remainder = total % subjectCount;

  return Array.from(
    { length: subjectCount },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
}
