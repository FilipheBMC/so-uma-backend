export type QuestionSearchFilters = {
  subject?: string;
  topic?: string;
  year?: number;
  examBoard?: string;
  organization?: string;
  jobTitle?: string;
  page?: number;
  perPage?: number;
  includeAnswerKey?: boolean;
  afterId?: string;
};

export type QuestionAlternative = {
  letter: string;
  textHtml: string;
  images: string[];
};

export type Question = {
  externalId: string;
  sourceProvider: string;
  statementHtml: string;
  alternatives: QuestionAlternative[];
  answerKey: string | null;
  attachments: string[];

  subject?: string;
  topic?: string;
  year?: number;
  examBoard?: string;
  organization?: string;
  jobTitle?: string;
  difficulty?: number;
  type?: string;
  annulled?: boolean;
};

export type QuestionSearchResult = {
  items: Question[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type OldQuestionsQuery = {
  amount?: number;
  subject?: string;
  onlyIncorrect?: boolean;
};