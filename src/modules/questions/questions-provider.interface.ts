import type {
  QuestionSearchFilters,
  QuestionSearchResult,
} from "./question.types.js";

export interface QuestionsProvider {
  readonly id: string;

  search(
    filters: QuestionSearchFilters,
  ): Promise<QuestionSearchResult>;
}
