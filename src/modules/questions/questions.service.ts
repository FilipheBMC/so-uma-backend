import { getQuestionsProvider } from "./providers/index.js";
import type { QuestionSearchFilters } from "./question.types.js";

export async function searchQuestions(
  filters: QuestionSearchFilters,
  providerId = "quest-api",
) {
  const provider = getQuestionsProvider(providerId);

  return provider.search(filters);
}

