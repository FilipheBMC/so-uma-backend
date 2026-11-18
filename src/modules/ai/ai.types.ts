export type AIUpload = {
  input?: string;
};

export type AIProvider = "openrouter" | "gemini";

/** Mensagens que podem ser enviadas pelo usuário ou retornadas pelo tutor. */
export type TutorConversationRole = "user" | "assistant";

export interface TutorConversationMessage {
  role: TutorConversationRole;
  content: string;
}

/** Estrutura normalizada da questão usada internamente pelo tutor. */
export interface QuestionTutorAlternative {
  key: string;
  text: string;
}

export interface QuestionTutorContext {
  statement: string;
  alternatives: QuestionTutorAlternative[];
  subject: string | null;
  topic: string | null;
  userAnswer: string | null;
  /**
   * Gabarito oficial obtido de uma fonte confiável no backend.
   * Não confiar em um gabarito enviado livremente pelo navegador.
   */
  correctAnswer: string | null;
}

export interface QuestionTutorInput {
  question: QuestionTutorContext;
  messages: TutorConversationMessage[];
}

/** Mensagem interna aceita pelo endpoint Chat Completions da OpenRouter. */
export interface OpenRouterChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface QuestionTutorResult {
  reply: string;
  model: string;
}
