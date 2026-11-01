export interface QuestApiQuestionFilters {
    banca?: string;
    ano?: string;
    materia?: string;
    assunto?: string;

    dificuldade?: number;
    tipo?: string;
    anulada?: boolean;

    area?: string;
    carreira?: string;
    nivel_escolaridade?: string;

    uf?: string;
    esfera?: string;
    orgao?: string;
    cargo?: string;

    codigo?: string;

    tem_gabarito?: boolean;
    tem_anexos?: boolean;

    include_gabarito?: boolean;
    include_total?: boolean;

    page?: number;
    per_page?: number;
    after_id?: string;
}

// Todo pro futuro
// Adicionando array em bacna e ano
export type QuestionSearchFilters = Omit<
    QuestApiQuestionFilters,
    "banca" | "ano"
> & {
    banca?: string[];
    ano?: string[];
};