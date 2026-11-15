export interface StudyPreparationSubjectInput {
    materia: string;
    topics: string[];
    amountQuestions: number;
}

export interface StudyPreparationRequest {
    subjects: StudyPreparationSubjectInput[];
}