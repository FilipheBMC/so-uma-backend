import type { QuestionsProvider } from "../questions-provider.interface.js";
import type {
  Question,
  QuestionSearchFilters,
  QuestionSearchResult,
} from "../question.types.js";

const BASE_URL = "https://api.quest.api.br/v2";

type QuestApiItem = {
  id: string;
  numero?: string;
  enunciado: string;
  alternativas: {
    letra: string;
    texto: string;
    imagens?: string[];
  }[];
  gabarito: string | null;
  provas: {
    ano: string;
    banca: string;
    orgao: string;
    cargo: string;
  }[];
  classificacao?: {
    materia?: string;
    assunto?: string;
  };
  anexos?: string[];
  dificuldade?: number;
  tipo?: string;
  anulada?: boolean;
};

type QuestApiResponse = {
  data: {
    total: number;
    page: number;
    per_page: number;
    next_cursor: string | null;
    has_more: boolean;
    items: QuestApiItem[];
  };
};

export class QuestApiProvider implements QuestionsProvider {
  readonly id = "quest-api";

  async search(
    filters: QuestionSearchFilters,
  ): Promise<QuestionSearchResult> {
    const apiKey = process.env.DB_QUEST;

    if (!apiKey) {
      throw new Error("QUEST_API_KEY não foi configurada.");
    }

    const url = new URL(`${BASE_URL}/questoes`);
    const params = url.searchParams;

    if (filters.subject) {
      params.set("materia", filters.subject);
    }

    if (filters.topic) {
      params.set("assunto", filters.topic);
    }

    if (filters.year !== undefined) {
      params.set("ano", String(filters.year));
    }

    if (filters.examBoard) {
      params.set("banca", filters.examBoard);
    }

    if (filters.organization) {
      params.set("orgao", filters.organization);
    }

    if (filters.jobTitle) {
      params.set("cargo", filters.jobTitle);
    }

    params.set("page", String(filters.page ?? 1));
    params.set("per_page", String(filters.perPage ?? 10));

    if (filters.includeAnswerKey) {
      params.set("include_gabarito", "true");
    }

    if (filters.afterId) {
      params.set("after_id", filters.afterId);
    }
    console.log({
  includeAnswerKey: filters.includeAnswerKey,
  includeGabarito: params.get("include_gabarito"),
});

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(
        `Quest API retornou HTTP ${response.status}.`,
      );
    }

    const payload =
      (await response.json()) as QuestApiResponse;

    const items: Question[] = payload.data.items.map((item) => {
      const exam = item.provas[0];
      const year = exam?.ano ? Number(exam.ano) : undefined;

      return {
        externalId: item.id,
        sourceProvider: this.id,
        statementHtml: item.enunciado,

        alternatives: item.alternativas.map((alternative) => ({
          letter: alternative.letra,
          textHtml: alternative.texto,
          images: alternative.imagens ?? [],
        })),

        answerKey: item.gabarito,
        attachments: item.anexos ?? [],

        ...(item.numero !== undefined
          ? { /* O número pode ser adicionado ao modelo depois. */ }
          : {}),

        ...(item.classificacao?.materia
          ? { subject: item.classificacao.materia }
          : {}),

        ...(item.classificacao?.assunto
          ? { topic: item.classificacao.assunto }
          : {}),

        // ...(Number.isFinite(year) ? { year } : {}),
        //Fixing the problen
        ...(year !== undefined && Number.isFinite(year)
          ? { year }
          : {}),
        ...(exam?.banca ? { examBoard: exam.banca } : {}),
        ...(exam?.orgao ? { organization: exam.orgao } : {}),
        ...(exam?.cargo ? { jobTitle: exam.cargo } : {}),
        ...(item.dificuldade !== undefined
          ? { difficulty: item.dificuldade }
          : {}),
        ...(item.tipo ? { type: item.tipo } : {}),
        ...(item.anulada !== undefined
          ? { annulled: item.anulada }
          : {}),
      };
    });

    return {
      items,
      pagination: {
        total: payload.data.total,
        page: payload.data.page,
        perPage: payload.data.per_page,
        nextCursor: payload.data.next_cursor,
        hasMore: payload.data.has_more,
      },
    };
  }
}