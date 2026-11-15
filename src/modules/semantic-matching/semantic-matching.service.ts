import { analyzeTextWithOpenRouter } from "../ai/openrouter.service.js";

import {
    findSubjectCandidates,
    findTopicCandidates,
    findApprovedSemanticMappings,
    normalizeSearchTerm,
    saveSemanticMappings,
} from "./semantic-matching.repository.js";

import type {
    SubjectCandidate,
    TopicCandidate,
} from "./semantic-matching.repository.js";

// ======================================================
// TIPOS
// ======================================================

export interface SemanticMatchingInput {
    materia: string;
    topics: string[];
}

export interface SemanticMatch {
    originalName: string;
    status: "MATCHED" | "NO_MATCH";
    catalogId: string | null;
    catalogName: string | null;
    confidence: number;
    lexicalScore: number | null;
    reason: string;
}

export interface SemanticTopicMatch extends SemanticMatch {
    catalogSubjectId: string | null;
    catalogSubjectName: string | null;
}

export interface SemanticMatchingResult {
    originalSubject: string;
    subjectMatch: SemanticMatch;
    topics: SemanticTopicMatch[];
}

interface ExpansionTopic {
    topicIndex: number;
    sourceTopic: string;
}

interface SearchExpansion {
    subjectTerms: string[];
    topicTerms: Map<number, string[]>;
}

// ======================================================
// CONFIGURAÇÕES
// ======================================================

const SUBJECT_CANDIDATE_LIMIT = 20;
const TOPIC_CANDIDATE_LIMIT = 12;
const TOPICS_PER_AI_REQUEST = 8;

// Abaixo desse valor, consideramos ampliar a pesquisa.
// Não representa uma probabilidade de equivalência.
const EXPANSION_THRESHOLD = 0.80;

// ======================================================
// PROMPTS
// ======================================================

const SEARCH_EXPANSION_PROMPT = `
Você é um especialista em terminologia de concursos públicos brasileiros.

Sua tarefa é sugerir termos alternativos para pesquisar matérias
e assuntos em um catálogo de questões.

Você NÃO deve selecionar candidatos nem decidir equivalências.

REGRAS:

1. Analise o significado do termo original.
2. Considere sinônimos e nomenclaturas alternativas.
3. Considere nomes técnicos, nomes tradicionais e denominações
   frequentemente utilizadas em concursos públicos.
4. Considere abreviações e nomes por extenso quando forem relevantes.
5. Não crie termos excessivamente amplos.
6. Não inclua assuntos apenas relacionados ao termo original.
7. Não invente disciplinas ou conteúdos.
8. Não repita o termo original.
9. Limite-se a cinco alternativas por termo.
10. Se não encontrar alternativas úteis, retorne uma lista vazia.

A matéria serve como contexto para compreender os assuntos.

Retorne exclusivamente um JSON neste formato:

{
  "subjectTerms": [
    "Termo alternativo 1",
    "Termo alternativo 2"
  ],
  "topicTerms": [
    {
      "topicIndex": 0,
      "terms": [
        "Termo alternativo 1",
        "Termo alternativo 2"
      ]
    }
  ]
}

Quando não houver alternativas, utilize arrays vazios.
`;


const SUBJECT_MATCHING_PROMPT = `
Você é um especialista em análise semântica de conteúdos programáticos
de concursos públicos brasileiros.

Sua tarefa é avaliar se uma matéria extraída de um edital possui
equivalência semântica com alguma matéria de um catálogo de questões.

REGRAS:

1. Analise o significado dos nomes, não apenas as palavras.
2. Considere sinônimos e diferentes formas de nomear o mesmo conteúdo.
3. Não considere dois conteúdos equivalentes apenas porque pertencem
   à mesma área do conhecimento.
4. Não confunda uma matéria específica com uma matéria muito mais ampla.
5. Escolha somente um candidato da lista recebida.
6. Nunca invente identificadores ou nomes.
7. Caso não exista equivalência suficientemente clara, retorne matched=false.
8. A confiança deve ser um número entre 0 e 1.
9. Seja conservador nas correspondências.
10. Escreva a justificativa em português.

Retorne exclusivamente um JSON com esta estrutura:

{
  "matched": true,
  "selectedCandidateId": "ID_DO_CANDIDATO",
  "confidence": 0.95,
  "reason": "Justificativa da correspondência"
}

Quando não existir correspondência:

{
  "matched": false,
  "selectedCandidateId": null,
  "confidence": 0,
  "reason": "Justificativa da ausência de correspondência"
}
`;



const TOPIC_MATCHING_PROMPT = `
Você é um especialista em análise semântica de conteúdos programáticos
de concursos públicos brasileiros.

Sua tarefa é comparar assuntos extraídos de um edital com candidatos
de um catálogo de questões.

O objetivo é identificar equivalência de significado e escopo conceitual,
não apenas semelhança entre palavras.

REGRAS OBRIGATÓRIAS:

1. Analise o significado do assunto original e dos candidatos.
2. Considere sinônimos, nomenclaturas alternativas e diferentes
   denominações utilizadas em concursos públicos.
3. Compare o escopo conceitual dos assuntos.
4. Não escolha um candidato apenas porque compartilha palavras
   com o termo original.
5. Não confunda assuntos relacionados com assuntos equivalentes.
6. Não escolha um assunto muito específico para representar um
   conteúdo mais amplo, quando ele aborda somente uma parte do tema.
7. Não escolha um assunto muito amplo para representar um conteúdo
   específico sem justificativa.
8. Um candidato que representa apenas um subtema do assunto original
   não deve ser considerado equivalente.
9. Considere a matéria de origem como contexto para interpretar o assunto.
10. Escolha somente candidatos que realmente representem o mesmo
    conteúdo conceitual.
11. Utilize exclusivamente os candidatos apresentados.
12. Nunca invente identificadores ou nomes.
13. Se nenhum candidato possuir equivalência adequada, retorne matched=false.
14. A confiança deve ser um número entre 0 e 1.
15. Escreva as justificativas em português.

EXEMPLO DE RACIOCÍNIO:

Assunto original:
"Administração de Recursos Humanos"

Candidato A:
"Gestão de Pessoas"

Candidato B:
"Modelos de Planejamento de Recursos Humanos"

O candidato A representa uma denominação alternativa da área temática.

O candidato B representa um aspecto específico dessa área,
relacionado ao planejamento.

Portanto, o candidato A é mais adequado para representar o assunto
original em seu sentido geral.

FORMATO DA RESPOSTA:

{
  "matches": [
    {
      "topicIndex": 0,
      "matched": true,
      "selectedCandidateId": "ID_DO_CANDIDATO",
      "confidence": 0.95,
      "reason": "Justificativa da correspondência"
    }
  ]
}

Quando não houver correspondência:

{
  "matches": [
    {
      "topicIndex": 0,
      "matched": false,
      "selectedCandidateId": null,
      "confidence": 0,
      "reason": "Justificativa da ausência de correspondência"
    }
  ]
}

Não considere que dois assuntos são equivalentes apenas porque
pertencem à mesma área de conhecimento.
`;


// ======================================================
// FUNÇÕES AUXILIARES
// ======================================================



function isRecord(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function parseAIResponse(content: string): unknown {
    try {
        return JSON.parse(content) as unknown;
    } catch {
        throw new Error(
            "A IA retornou uma resposta que não é um JSON válido.",
        );
    }
}

function validateConfidence(value: unknown): number {
    if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1
    ) {
        throw new Error(
            "A IA retornou um nível de confiança inválido.",
        );
    }

    return value;
}

function validateReason(value: unknown): string {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(
            "A IA não forneceu uma justificativa válida.",
        );
    }

    return value.trim();
}

function cleanTerms(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const uniqueTerms = new Map<string, string>();

    for (const item of value) {
        if (typeof item !== "string") {
            continue;
        }

        const term = item.trim();

        if (!term) {
            continue;
        }

        const normalizedKey = term
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/\s+/g, " ");

        if (!uniqueTerms.has(normalizedKey)) {
            uniqueTerms.set(normalizedKey, term);
        }
    }

    return [...uniqueTerms.values()].slice(0, 5);
}

function shouldExpandCandidates(
    candidates: Array<{
        score: number;
    }>,
): boolean {
    return (
        candidates.length === 0 ||
        (candidates[0]?.score ?? 0) < EXPANSION_THRESHOLD
    );
}

function chunk<T>(items: T[], size: number): T[][] {
    const result: T[][] = [];

    for (let i = 0; i < items.length; i += size) {
        result.push(items.slice(i, i + size));
    }

    return result;
}

// ======================================================
// EXPANSÃO DA PESQUISA COM IA
// ======================================================

async function expandSearchTerms(
    materia: string,
    topics: ExpansionTopic[],
    expandSubject: boolean,
): Promise<SearchExpansion> {
    const content = await analyzeTextWithOpenRouter({
        prompt: SEARCH_EXPANSION_PROMPT,

        text: JSON.stringify({
            materia,
            expandSubject,

            topics: topics.map((topic) => ({
                topicIndex: topic.topicIndex,
                name: topic.sourceTopic,
            })),
        }),

        outputFormat: "json",
    });

    const result = parseAIResponse(content);

    if (!isRecord(result)) {
        throw new Error(
            "A IA retornou uma estrutura inválida na expansão da pesquisa.",
        );
    }

    const subjectTerms = expandSubject
        ? cleanTerms(result.subjectTerms)
        : [];

    const topicTerms = new Map<number, string[]>();

    if (Array.isArray(result.topicTerms)) {
        for (const item of result.topicTerms) {
            if (!isRecord(item)) {
                continue;
            }

            const index = item.topicIndex;

            if (
                typeof index !== "number" ||
                !Number.isInteger(index)
            ) {
                continue;
            }

            const requestedTopic = topics.find(
                (topic) => topic.topicIndex === index,
            );

            if (!requestedTopic) {
                continue;
            }

            const terms = cleanTerms(item.terms);

            if (terms.length > 0) {
                topicTerms.set(index, terms);
            }
        }
    }

    return {
        subjectTerms,
        topicTerms,
    };
}

// ======================================================
// AVALIAÇÃO DE MATÉRIA
// ======================================================

interface SubjectSelection {
    matched: boolean;
    selectedCandidateId: string | null;
    confidence: number;
    reason: string;
}

async function evaluateSubject(
    materia: string,
    candidates: SubjectCandidate[],
): Promise<SubjectSelection> {
    const content = await analyzeTextWithOpenRouter({
        prompt: SUBJECT_MATCHING_PROMPT,

        text: JSON.stringify({
            sourceSubject: materia,

            candidates: candidates.map((candidate) => ({
                id: candidate.id,
                name: candidate.name,
            })),
        }),

        outputFormat: "json",
    });

    const result = parseAIResponse(content);

    if (!isRecord(result)) {
        throw new Error(
            "Resposta inválida na análise da matéria.",
        );
    }

    if (typeof result.matched !== "boolean") {
        throw new Error(
            "A IA não informou se encontrou uma correspondência.",
        );
    }

    const confidence = validateConfidence(result.confidence);
    const reason = validateReason(result.reason);

    if (!result.matched) {
        return {
            matched: false,
            selectedCandidateId: null,
            confidence,
            reason,
        };
    }

    if (typeof result.selectedCandidateId !== "string") {
        throw new Error(
            "A IA não retornou o identificador da matéria selecionada.",
        );
    }

    const selectedCandidate = candidates.find(
        (candidate) => candidate.id === result.selectedCandidateId,
    );

    if (!selectedCandidate) {
        throw new Error(
            "A IA selecionou uma matéria que não estava entre os candidatos.",
        );
    }

    return {
        matched: true,
        selectedCandidateId: selectedCandidate.id,
        confidence,
        reason,
    };
}

// ======================================================
// AVALIAÇÃO DE ASSUNTOS
// ======================================================

interface TopicInput {
    topicIndex: number;
    sourceTopic: string;
    candidates: TopicCandidate[];
}

interface TopicSelection {
    topicIndex: number;
    matched: boolean;
    selectedCandidateId: string | null;
    confidence: number;
    reason: string;
}

async function evaluateTopicsBatch(
    topics: TopicInput[],
): Promise<TopicSelection[]> {
    const content = await analyzeTextWithOpenRouter({
        prompt: TOPIC_MATCHING_PROMPT,

        text: JSON.stringify({
            topics: topics.map((topic) => ({
                topicIndex: topic.topicIndex,
                sourceTopic: topic.sourceTopic,

                candidates: topic.candidates.map((candidate) => ({
                    id: candidate.id,
                    name: candidate.name,
                    subjectName: candidate.subject_name,
                })),
            })),
        }),

        outputFormat: "json",
    });

    const result = parseAIResponse(content);

    if (!isRecord(result) || !Array.isArray(result.matches)) {
        throw new Error(
            "A IA retornou uma estrutura inválida para os assuntos.",
        );
    }

    const selections: TopicSelection[] = [];
    const processedIndexes = new Set<number>();

    for (const item of result.matches) {
        if (!isRecord(item)) {
            throw new Error(
                "A IA retornou um item inválido na lista de assuntos.",
            );
        }

        const topicIndex = item.topicIndex;

        if (
            typeof topicIndex !== "number" ||
            !Number.isInteger(topicIndex)
        ) {
            throw new Error(
                "A IA retornou um índice de assunto inválido.",
            );
        }

        if (processedIndexes.has(topicIndex)) {
            throw new Error(
                `A IA retornou o assunto ${topicIndex} mais de uma vez.`,
            );
        }

        processedIndexes.add(topicIndex);

        const originalTopic = topics.find(
            (topic) => topic.topicIndex === topicIndex,
        );

        if (!originalTopic) {
            throw new Error(
                `A IA retornou um índice inexistente: ${topicIndex}.`,
            );
        }

        if (typeof item.matched !== "boolean") {
            throw new Error(
                "A IA não informou se o assunto possui correspondência.",
            );
        }

        const confidence = validateConfidence(item.confidence);
        const reason = validateReason(item.reason);

        if (!item.matched) {
            selections.push({
                topicIndex,
                matched: false,
                selectedCandidateId: null,
                confidence,
                reason,
            });

            continue;
        }

        if (typeof item.selectedCandidateId !== "string") {
            throw new Error(
                `A IA não informou o candidato para ${originalTopic.sourceTopic}.`,
            );
        }

        const selectedCandidate = originalTopic.candidates.find(
            (candidate) => candidate.id === item.selectedCandidateId,
        );

        if (!selectedCandidate) {
            throw new Error(
                `A IA selecionou um candidato inexistente para ${originalTopic.sourceTopic}.`,
            );
        }

        selections.push({
            topicIndex,
            matched: true,
            selectedCandidateId: selectedCandidate.id,
            confidence,
            reason,
        });
    }

    // Assuntos omitidos pela IA permanecem sem correspondência.

    for (const topic of topics) {
        if (!processedIndexes.has(topic.topicIndex)) {
            selections.push({
                topicIndex: topic.topicIndex,
                matched: false,
                selectedCandidateId: null,
                confidence: 0,
                reason: "A IA não retornou uma avaliação para este assunto.",
            });
        }
    }

    return selections.sort(
        (a, b) => a.topicIndex - b.topicIndex,
    );
}

// ======================================================
// SERVIÇO PRINCIPAL
// ======================================================

export async function matchSubjectAndTopics(
    input: SemanticMatchingInput,
): Promise<SemanticMatchingResult> {
    const materia = input.materia.trim();

    if (!materia) {
        throw new Error("A matéria do edital não foi informada.");
    }

    if (!Array.isArray(input.topics)) {
        throw new Error("A lista de assuntos precisa ser um array.");
    }

    if (
        input.topics.some(
            (topic) => typeof topic !== "string",
        )
    ) {
        throw new Error(
            "Todos os assuntos precisam ser textos.",
        );
    }

    const topics = input.topics.map((topic) => topic.trim());

    // ====================================================
    // 0. CONSULTA DE EQUIVALÊNCIAS JÁ APROVADAS
    // ====================================================

    const approvedMappings = await findApprovedSemanticMappings(
        materia,
        topics,
    );

    const approvedByTopic = new Map<
        string,
        (typeof approvedMappings)[number]
    >();

    for (const mapping of approvedMappings) {
        if (
            mapping.normalized_source_topic &&
            mapping.quest_topic &&
            mapping.quest_subject
        ) {
            approvedByTopic.set(
                mapping.normalized_source_topic,
                mapping,
            );
        }
    }

    // Verifica se todos os assuntos já possuem equivalências
    // aprovadas e vinculadas à mesma matéria do catálogo.

    const cachedMappings = topics.map((topic) =>
        approvedByTopic.get(normalizeSearchTerm(topic)),
    );

    const canReuseEntireRequest =
        topics.length > 0 &&
        cachedMappings.every(
            (mapping) =>
                mapping !== undefined &&
                mapping.quest_topic !== null &&
                mapping.quest_subject_id === mapping.quest_topic.subject_id,
        );

    const cachedSubjectIds = new Set(
        cachedMappings
            .filter((mapping) => mapping !== undefined)
            .map((mapping) => mapping.quest_subject_id),
    );

    if (
        canReuseEntireRequest &&
        cachedSubjectIds.size === 1
    ) {
        const mappings = cachedMappings.filter(
            (mapping) => mapping !== undefined,
        );

        const firstMapping = mappings[0];

        if (firstMapping?.quest_subject) {
            console.log(
                "\nTodas as equivalências foram recuperadas do histórico.",
            );

            return {
                originalSubject: materia,

                subjectMatch: {
                    originalName: materia,
                    status: "MATCHED",
                    catalogId: firstMapping.quest_subject.id,
                    catalogName: firstMapping.quest_subject.name,
                    confidence: Math.min(
                        ...mappings.map((mapping) =>
                            Number(mapping.confidence ?? 0),
                        ),
                    ),
                    lexicalScore: null,
                    reason:
                        "Matéria recuperada por meio das equivalências anteriormente aprovadas.",
                },

                topics: mappings.map((mapping, index) => ({
                    originalName: topics[index] ?? mapping.source_topic_name ?? "",
                    status: "MATCHED",
                    catalogId: mapping.quest_topic!.id,
                    catalogName: mapping.quest_topic!.name,
                    catalogSubjectId: mapping.quest_subject.id,
                    catalogSubjectName: mapping.quest_subject.name,
                    confidence: Number(mapping.confidence ?? 0),
                    lexicalScore: null,
                    reason:
                        "Correspondência anteriormente aprovada e reutilizada do histórico.",
                })),
            };
        }
    }

    // ====================================================
    // 1. BUSCA INICIAL DA MATÉRIA
    // ====================================================

    console.log(`\nPesquisando matéria: ${materia}`);

    let subjectCandidates = await findSubjectCandidates(
        materia,
        SUBJECT_CANDIDATE_LIMIT,
    );

    // ====================================================
    // 2. EXPANSÃO DA BUSCA DA MATÉRIA, SE NECESSÁRIO
    // ====================================================

    if (shouldExpandCandidates(subjectCandidates)) {
        console.log(
            "Poucos candidatos relevantes. Solicitando expansão semântica...",
        );

        const expansion = await expandSearchTerms(
            materia,
            [],
            true,
        );

        if (expansion.subjectTerms.length > 0) {
            console.log(
                "Termos alternativos:",
                expansion.subjectTerms,
            );

            subjectCandidates = await findSubjectCandidates(
                materia,
                SUBJECT_CANDIDATE_LIMIT,
                expansion.subjectTerms,
            );
        }
    }

    if (subjectCandidates.length === 0) {
        return {
            originalSubject: materia,

            subjectMatch: {
                originalName: materia,
                status: "NO_MATCH",
                catalogId: null,
                catalogName: null,
                confidence: 0,
                lexicalScore: null,
                reason: "Nenhuma matéria candidata foi encontrada no catálogo.",
            },

            topics: topics.map((topic) => ({
                originalName: topic,
                status: "NO_MATCH",
                catalogId: null,
                catalogName: null,
                catalogSubjectId: null,
                catalogSubjectName: null,
                confidence: 0,
                lexicalScore: null,
                reason: "Não foi possível identificar a matéria correspondente.",
            })),
        };
    }

    console.log(
        `Candidatos de matéria encontrados: ${subjectCandidates.length}`,
    );

    // ====================================================
    // 3. AVALIAÇÃO DA MATÉRIA COM IA
    // ====================================================

    const subjectSelection = await evaluateSubject(
        materia,
        subjectCandidates,
    );

    if (!subjectSelection.matched) {
        return {
            originalSubject: materia,

            subjectMatch: {
                originalName: materia,
                status: "NO_MATCH",
                catalogId: null,
                catalogName: null,
                confidence: subjectSelection.confidence,
                lexicalScore: null,
                reason: subjectSelection.reason,
            },

            topics: topics.map((topic) => ({
                originalName: topic,
                status: "NO_MATCH",
                catalogId: null,
                catalogName: null,
                catalogSubjectId: null,
                catalogSubjectName: null,
                confidence: 0,
                lexicalScore: null,
                reason: "A matéria não possui correspondência identificada.",
            })),
        };
    }

    const selectedSubject = subjectCandidates.find(
        (candidate) =>
            candidate.id === subjectSelection.selectedCandidateId,
    );

    if (!selectedSubject) {
        throw new Error(
            "A matéria selecionada não foi encontrada entre os candidatos.",
        );
    }

    console.log(
        `Matéria selecionada: ${selectedSubject.name}`,
    );

    // ====================================================
    // EQUIVALÊNCIAS APROVADAS DA MATÉRIA SELECIONADA
    // ====================================================

    const approvedForSelectedSubject = new Map<
        string,
        (typeof approvedMappings)[number]
    >();

    for (const [normalizedTopic, mapping] of approvedByTopic) {
        if (
            mapping.quest_subject_id === selectedSubject.id &&
            mapping.quest_topic &&
            mapping.quest_subject
        ) {
            approvedForSelectedSubject.set(
                normalizedTopic,
                mapping,
            );
        }
    }

    // ====================================================
    // 4. BUSCA INICIAL DOS ASSUNTOS
    // ====================================================

    const topicInputs: TopicInput[] = [];

    for (const [topicIndex, sourceTopic] of topics.entries()) {
        if (!sourceTopic) {
            continue;
        }

        if (
            approvedForSelectedSubject.has(
                normalizeSearchTerm(sourceTopic),
            )
        ) {
            continue;
        }

        const candidates = await findTopicCandidates(
            sourceTopic,
            selectedSubject.id,
            TOPIC_CANDIDATE_LIMIT,
        );

        topicInputs.push({
            topicIndex,
            sourceTopic,
            candidates,
        });
    }

    // ====================================================
    // 5. IDENTIFICA ASSUNTOS QUE PRECISAM DE EXPANSÃO
    // ====================================================

    const topicsNeedingExpansion = topicInputs.filter(
        (topic) => shouldExpandCandidates(topic.candidates),
    );

    if (topicsNeedingExpansion.length > 0) {
        console.log(
            `\nExpandindo a pesquisa de ${topicsNeedingExpansion.length} assunto(s)...`,
        );

        const expansion = await expandSearchTerms(
            materia,
            topicsNeedingExpansion.map((topic) => ({
                topicIndex: topic.topicIndex,
                sourceTopic: topic.sourceTopic,
            })),
            false,
        );

        // ==================================================
        // 6. NOVA PESQUISA COM TERMOS ALTERNATIVOS
        // ==================================================

        for (const topic of topicsNeedingExpansion) {
            const additionalTerms =
                expansion.topicTerms.get(topic.topicIndex) ?? [];

            if (additionalTerms.length === 0) {
                continue;
            }

            console.log(
                `Termos alternativos para "${topic.sourceTopic}":`,
                additionalTerms,
            );

            topic.candidates = await findTopicCandidates(
                topic.sourceTopic,
                selectedSubject.id,
                TOPIC_CANDIDATE_LIMIT,
                additionalTerms,
            );
        }
    }

    // ====================================================
    // 7. PREPARA ASSUNTOS COM CANDIDATOS
    // ====================================================

    const topicsWithCandidates = topicInputs.filter(
        (topic) => topic.candidates.length > 0,
    );

    // ====================================================
    // 8. AVALIAÇÃO DOS ASSUNTOS COM IA
    // ====================================================

    const topicSelections: TopicSelection[] = [];

    for (
        const batch of chunk(
            topicsWithCandidates,
            TOPICS_PER_AI_REQUEST,
        )
    ) {
        const evaluatedTopics = await evaluateTopicsBatch(batch);

        topicSelections.push(...evaluatedTopics);
    }

    const selectionByIndex = new Map(
        topicSelections.map((selection) => [
            selection.topicIndex,
            selection,
        ]),
    );

    // ====================================================
    // 9. MONTA O RESULTADO FINAL
    // ====================================================

    const topicResults: SemanticTopicMatch[] = topics.map(
        (sourceTopic, topicIndex) => {

            const approvedMapping = approvedForSelectedSubject.get(
                normalizeSearchTerm(sourceTopic),
            );

            if (
                approvedMapping?.quest_topic &&
                approvedMapping.quest_subject
            ) {
                return {
                    originalName: sourceTopic,
                    status: "MATCHED",
                    catalogId: approvedMapping.quest_topic.id,
                    catalogName: approvedMapping.quest_topic.name,
                    catalogSubjectId: approvedMapping.quest_subject.id,
                    catalogSubjectName: approvedMapping.quest_subject.name,
                    confidence: Number(approvedMapping.confidence ?? 0),
                    lexicalScore: null,
                    reason:
                        "Correspondência anteriormente aprovada e reutilizada do histórico.",
                };
            }

            const topicSelection = selectionByIndex.get(topicIndex);

            const originalTopic = topicInputs.find(
                (topic) => topic.topicIndex === topicIndex,
            );

            if (!topicSelection || !topicSelection.matched) {
                return {
                    originalName: sourceTopic,
                    status: "NO_MATCH",
                    catalogId: null,
                    catalogName: null,
                    catalogSubjectId: selectedSubject.id,
                    catalogSubjectName: selectedSubject.name,
                    confidence: topicSelection?.confidence ?? 0,
                    lexicalScore: null,
                    reason:
                        topicSelection?.reason ??
                        (originalTopic?.candidates.length === 0
                            ? "Nenhum candidato adequado foi encontrado no catálogo."
                            : "Não foi possível confirmar uma correspondência."),
                };
            }

            const selectedTopic = originalTopic?.candidates.find(
                (candidate) =>
                    candidate.id === topicSelection.selectedCandidateId,
            );

            if (!selectedTopic) {
                throw new Error(
                    `Não foi possível recuperar o candidato para ${sourceTopic}.`,
                );
            }

            return {
                originalName: sourceTopic,
                status: "MATCHED",
                catalogId: selectedTopic.id,
                catalogName: selectedTopic.name,
                catalogSubjectId: selectedTopic.subject_id,
                catalogSubjectName: selectedTopic.subject_name,
                confidence: topicSelection.confidence,
                lexicalScore: selectedTopic.score,
                reason: topicSelection.reason,
            };
        },
    );

    // ====================================================
    // 10. SALVAR EQUIVALÊNCIAS ENCONTRADAS
    // ====================================================

    const mappingsToSave = topicResults.flatMap((topic) => {
        if (
            topic.status !== "MATCHED" ||
            !topic.catalogId ||
            !topic.catalogSubjectId
        ) {
            return [];
        }

        return [
            {
                sourceSubjectName: materia,
                sourceTopicName: topic.originalName,
                questSubjectId: topic.catalogSubjectId,
                questTopicId: topic.catalogId,
                confidence: topic.confidence,
            },
        ];
    });

    const persistenceResult = await saveSemanticMappings(
        mappingsToSave,
    );

    console.log("\nEquivalências armazenadas:");

    console.log(`Novas: ${persistenceResult.created}`);
    console.log(`Atualizadas: ${persistenceResult.updated}`);
    console.log(`Preservadas: ${persistenceResult.preserved}`);

    return {
        originalSubject: materia,

        subjectMatch: {
            originalName: materia,
            status: "MATCHED",
            catalogId: selectedSubject.id,
            catalogName: selectedSubject.name,
            confidence: subjectSelection.confidence,
            lexicalScore: selectedSubject.score,
            reason: subjectSelection.reason,
        },

        topics: topicResults,
    };

}

