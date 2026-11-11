import type { Question } from "../questions/question.types.js";
import type { EditalAnalysis, ManualStudyInput } from "./study.interface.js";

export type PreparedSubject = {
  name: string;
  topics: string[];
  questions: Question[];
  questionsReturned: number;
  totalAvailable: number;
  status: "success" | "no-results" | "error";
  message?: string;
};

export type StudyPreparationResult = {
  subjects: PreparedSubject[];
  summary: {
    subjectsProcessed: number;
    subjectsWithQuestions: number;
    totalQuestionsReturned: number;
  };
};

export type StudyOrchestratorInput =
  | {
      source: "edital";
      data: EditalAnalysis;
    }
  | {
      source: "manual";
      data: ManualStudyInput;
    };