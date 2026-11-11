export interface EditalGroup {
  name: string;
  questionCount: number | null;
}

export interface EditalSubject {
  name: string;
  group: string | null;
  questionCount: number | null;
}

export interface EditalAnalysis {
  totalQuestions: number | null;
  groups: EditalGroup[];
  subjects: EditalSubject[];
}

export interface ManualStudyInput {
  subject: string;
  amount: number;
}