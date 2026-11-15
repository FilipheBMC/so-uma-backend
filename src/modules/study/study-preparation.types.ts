// import type { Question } from "../questions/question.types.js";
// import type { EditalAnalysis, ManualStudyInput } from "./study.interface.js";

// export type PreparedSubject = {
//   name: string;
//   topics: string[];
//   questions: Question[];
//   questionsReturned: number;
//   totalAvailable: number;
//   status: "success" | "no-results" | "error";
//   message?: string;
// };

// export type StudyPreparationResult = {
//   subjects: PreparedSubject[];
//   summary: {
//     subjectsProcessed: number;
//     subjectsWithQuestions: number;
//     totalQuestionsReturned: number;
//   };
// };

// export type StudyOrchestratorInput =
//   | {
//       source: "edital";
//       data: EditalAnalysis;
//     }
//   | {
//       source: "manual";
//       data: ManualStudyInput;
//     };

import type { Question } from "../questions/question.types.js";
import type {
    EditalAnalysis,
    ManualStudyInput,
} from "./study.interface.js";

import type {
    StudyPreparationRequest,
} from "../../types/Communication.types.js"

// Resultado de cada matéria processada.
export type PreparedSubject = {
    name: string;
    topics: string[];
    questions: Question[];
    questionsReturned: number;
    totalAvailable: number;
    status: "success" | "no-results" | "error";
    message?: string;
};

// Resultado completo da preparação.
export type StudyPreparationResult = {
    subjects: PreparedSubject[];
    summary: {
        subjectsProcessed: number;
        subjectsWithQuestions: number;
        totalQuestionsReturned: number;
    };
};

// Entradas aceitas pelo orquestrador.
// O formato novo será utilizado pela próxima versão da rota.
export type StudyOrchestratorInput =
    | {
        source: "edital";
        data: EditalAnalysis;
    }
    | {
        source: "manual";
        data: ManualStudyInput;
    }
    | StudyPreparationRequest;


export type ResolvedStudyTopic = {
    originalName: string;
    resolvedName: string;
    status: "MATCHED" | "NO_MATCH" | "NOT_ANALYZED" | "ERROR_FALLBACK";
    catalogId: string | null;
    catalogSubjectId: string | null;
    confidence: number | null;
    reason: string | null;
};

export type ResolvedStudySubject = {
    originalName: string;
    resolvedName: string;
    amount: number | null;
    status: "MATCHED" | "NO_MATCH" | "NOT_ANALYZED" | "ERROR_FALLBACK";
    catalogId: string | null;
    confidence: number | null;
    reason: string | null;
    topics: ResolvedStudyTopic[];
};
