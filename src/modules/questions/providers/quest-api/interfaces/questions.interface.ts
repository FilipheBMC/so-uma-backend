export interface QuestApiAlternative {
  letra: string;
  texto: string;
  imagens: string[];
}

export interface QuestApiExam {
  id: string;
  orgao: string;
  cargo: string;
  ano: string;
  banca: string;
  alternative_type: string;
  nivel_escolaridade: string;
  uf: string;
  esfera: string;
}

export interface QuestApiClassification {
  materia: string;
  assunto: string;
}

export interface QuestApiFlags {
  tem_imagem: boolean;
  tem_gabarito: boolean;
  tem_texto_associado: boolean;
  anulada: boolean;
}

export interface QuestApiQuestion {
  id: string;
  numero: string;
  enunciado: string;
  alternativas: QuestApiAlternative[];
  gabarito: string | null;
  provas: QuestApiExam[];
  classificacao: QuestApiClassification;
  textos_associados: string[];
  anexos: string[];
  sinalizadores: QuestApiFlags;
  dificuldade: number;
  tipo: string;
  anulada: boolean;
  areas: string[];
  carreiras: string[];
}

export interface QuestApiFacet {
  id: number;
  count: number;
}

export interface QuestApiFacets {
  level_ids: QuestApiFacet[];
  subject_ids: QuestApiFacet[];
  board_ids: QuestApiFacet[];
  exam_ids: QuestApiFacet[];
  institution_ids: QuestApiFacet[];
  position_ids: QuestApiFacet[];
}

export interface QuestApiQuestionsData {
  total: number;
  page: number;
  per_page: number;
  items: QuestApiQuestion[];
  next_cursor: string | null;
  has_more: boolean;
  facets: QuestApiFacets;
}

export interface QuestApiResponse {
  data: QuestApiQuestionsData;
  meta: {
    correlationId: string;
    timestamp: string;
  };
}

export interface QuestionSubjectResult {
  materia: string;
  questions: QuestApiResponse;
}

export interface QuestionServiceResult {
  results: QuestionSubjectResult[];
  notifications: string[];
}