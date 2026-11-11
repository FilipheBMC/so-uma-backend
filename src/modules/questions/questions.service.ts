import { getQuestionsProvider } from "./providers/index.js";
import type { QuestionServiceResult, QuestionSubjectResult } from "./providers/quest-api/interfaces/questions.interface.js";
import { questionGetter } from "./providers/quest-api/provider.service.js";
import type { QuestionResearcher } from "./question.interface.js";
import type { QuestionSearchFilters } from "./question.types.js";

export async function searchQuestions(
  filters: QuestionSearchFilters,
  providerId = "quest-api",
) {
  const provider = getQuestionsProvider(providerId);

  return provider.search(filters);
}

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

export async function questionService(
  data: QuestionResearcher
): Promise<QuestionServiceResult> {

  const results: QuestionSubjectResult[] = [];
  const notifications: string[] = [];

  for (const subject of data.subjects) {
    if (subject.amount === null || subject.amount <= 0) {
      continue;
    }

    try {
      const questions = await questionGetter({
        subject: subject.name,
        amount: subject.amount,
      });

      results.push({
        materia: subject.name,
        questions,
      });

      if (questions.data.items.length === 0) {
        notifications.push(
          `Nenhuma questão encontrada para ${subject.name}.`
        );
      }

    } catch (error) {
      console.error(`Erro ao buscar ${subject.name}:`, error);

      notifications.push(
        `Não foi possível buscar questões de ${subject.name}.`
      );
    }
  }

  return {
    results,
    notifications,
  };
}