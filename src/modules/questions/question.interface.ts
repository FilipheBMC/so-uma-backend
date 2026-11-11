export type QuestionResearcherQuestion = {
    subject: string;
    amount: number;
}

export interface QuestionResearcher {
  subjects: {
    name: string;
    amount: number | null;
  }[];
}