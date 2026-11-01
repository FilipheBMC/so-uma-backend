export type DistributionStatus =
  | "explicit"
  | "partial"
  | "not_found";

export type EditalSubject = {
  name: string;
  questionCount: number | null;
  topics: string[];
};

export type EditalAnalysisResult = {
  examStructure: {
    totalQuestions: number | null;
    distributionStatus: DistributionStatus;
    notes: string[];
  };
  subjects: EditalSubject[];
};