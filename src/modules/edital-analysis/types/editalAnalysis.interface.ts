export interface EditalAnalysis {
    concurso: {
        nome: string | null;
        orgao?: string | null;
        banca: string | null;
    };

    cargos: CargoEdital[];

    datas: {
        inicioInscricao: string | null;
        fimInscricao: string | null;
        dataProva: string | null;
    };

    prova: {
        quantidadeTotalQuestoes: number | null;
        duracaoMinutos: number | null;
    };

    disciplinas: DisciplinaEdital[];
}

export type NivelEscolaridade =
    | "Fundamental"
    | "Médio"
    | "Superior";

export interface CargoEdital {
    nome: string;
    nivel: NivelEscolaridade | null;
    escolaridadeExigida: string | null;
    salario: number | null;
    quantidadeVagas: number | null;
    cargaHorariaSemanal: number | null;
}

export interface DisciplinaEdital {
    nome: string;
    topicos: string[];
    quantidadeQuestoes?: number | null;
}