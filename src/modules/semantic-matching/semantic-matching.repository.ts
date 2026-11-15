
import { questCatalogPrisma } from "../../lib/questCatalogPrisma.js";

// ======================================================
// TIPOS
// ======================================================

export interface SubjectCandidate {
  id: string;
  name: string;
  normalized_name: string;
  score: number;
}

export interface TopicCandidate {
  id: string;
  name: string;
  normalized_name: string;
  subject_id: string;
  subject_name: string;
  score: number;
}

export interface SemanticMappingInput {
  sourceSubjectName: string;
  sourceTopicName: string;
  questSubjectId: string;
  questTopicId: string;
  confidence: number;
  model?: string;
}

export interface SemanticMappingSaveResult {
  created: number;
  updated: number;
  preserved: number;
}

// ======================================================
// CONFIGURAÇÕES
// ======================================================

const STOP_WORDS = new Set([
  "a", "as", "o", "os",
  "de", "da", "das", "do", "dos",
  "e", "em", "no", "na", "nos", "nas",
  "um", "uma", "para", "por", "com",
]);

const MAX_CANDIDATES_TO_RANK = 1000;

// ======================================================
// NORMALIZAÇÃO
// ======================================================

export function normalizeSearchTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function tokenize(value: string): Set<string> {
  return new Set(
    normalizeSearchTerm(value)
      .split(/\s+/)
      .filter(
        (token) =>
          token.length >= 3 &&
          !STOP_WORDS.has(token),
      ),
  );
}

function prepareSearchTerms(
  originalTerm: string,
  additionalTerms: string[],
): string[] {
  return [
    ...new Set(
      [originalTerm, ...additionalTerms]
        .map(normalizeSearchTerm)
        .filter((term) => term.length >= 3),
    ),
  ];
}

function getSearchTokens(terms: string[]): string[] {
  const tokens = new Set<string>();

  for (const term of terms) {
    for (const token of tokenize(term)) {
      tokens.add(token);
    }
  }

  return [...tokens];
}

// ======================================================
// SIMILARIDADE TEXTUAL
// ======================================================

function calculateTextSimilarity(
  searchTerm: string,
  candidateName: string,
): number {
  const normalizedSearch = normalizeSearchTerm(searchTerm);
  const normalizedCandidate = normalizeSearchTerm(candidateName);

  if (normalizedSearch === normalizedCandidate) {
    return 1;
  }

  if (
    normalizedCandidate.includes(normalizedSearch) ||
    normalizedSearch.includes(normalizedCandidate)
  ) {
    return 0.95;
  }

  const searchTokens = tokenize(normalizedSearch);
  const candidateTokens = tokenize(normalizedCandidate);

  if (
    searchTokens.size === 0 ||
    candidateTokens.size === 0
  ) {
    return 0;
  }

  const intersection = [...searchTokens].filter(
    (token) => candidateTokens.has(token),
  ).length;

  const dice =
    (2 * intersection) /
    (searchTokens.size + candidateTokens.size);

  return Number(dice.toFixed(4));
}

function calculateBestSimilarity(
  searchTerms: string[],
  candidateName: string,
): number {
  let bestScore = 0;

  for (const term of searchTerms) {
    const score = calculateTextSimilarity(
      term,
      candidateName,
    );

    if (score > bestScore) {
      bestScore = score;
    }
  }

  return bestScore;
}

// ======================================================
// VALIDAÇÃO DO LIMITE
// ======================================================

function validateLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("O limite de candidatos precisa ser positivo.");
  }

  return Math.min(limit, 100);
}

// ======================================================
// BUSCA DE MATÉRIAS
// ======================================================

export async function findSubjectCandidates(
  searchTerm: string,
  limit = 30,
  additionalTerms: string[] = [],
): Promise<SubjectCandidate[]> {
  const searchTerms = prepareSearchTerms(
    searchTerm,
    additionalTerms,
  );

  const tokens = getSearchTokens(searchTerms);

  if (tokens.length === 0) {
    return [];
  }

  const subjects =
    await questCatalogPrisma.questCatalogSubject.findMany({
      where: {
        is_active: true,

        OR: tokens.map((token) => ({
          normalized_name: {
            contains: token,
          },
        })),
      },

      select: {
        id: true,
        name: true,
        normalized_name: true,
      },

      take: MAX_CANDIDATES_TO_RANK,
    });

  return subjects
    .map((subject) => ({
      ...subject,

      score: calculateBestSimilarity(
        searchTerms,
        subject.normalized_name,
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, validateLimit(limit));
}

// ======================================================
// BUSCA DE ASSUNTOS
// ======================================================

export async function findTopicCandidates(
  searchTerm: string,
  subjectId?: string,
  limit = 30,
  additionalTerms: string[] = [],
): Promise<TopicCandidate[]> {
  const searchTerms = prepareSearchTerms(
    searchTerm,
    additionalTerms,
  );

  const tokens = getSearchTokens(searchTerms);

  if (tokens.length === 0) {
    return [];
  }

  const topics =
    await questCatalogPrisma.questCatalogTopic.findMany({
      where: {
        is_active: true,

        ...(subjectId ? { subject_id: subjectId } : {}),

        OR: tokens.map((token) => ({
          normalized_name: {
            contains: token,
          },
        })),
      },

      select: {
        id: true,
        name: true,
        normalized_name: true,
        subject_id: true,

        subject: {
          select: {
            name: true,
          },
        },
      },

      take: MAX_CANDIDATES_TO_RANK,
    });

  return topics
    .map((topic) => ({
      id: topic.id,
      name: topic.name,
      normalized_name: topic.normalized_name,
      subject_id: topic.subject_id,
      subject_name: topic.subject.name,

      score: calculateBestSimilarity(
        searchTerms,
        topic.normalized_name,
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, validateLimit(limit));
}

// ======================================================
// ARMAZENAMENTO DAS EQUIVALÊNCIAS SEMÂNTICAS
// ======================================================

export async function saveSemanticMappings(
  mappings: SemanticMappingInput[],
): Promise<SemanticMappingSaveResult> {
  const result: SemanticMappingSaveResult = {
    created: 0,
    updated: 0,
    preserved: 0,
  };

  if (mappings.length === 0) {
    return result;
  }

  const model =
    process.env.OPENROUTER_MODEL?.trim() || "openrouter/free";

  await questCatalogPrisma.$transaction(async (tx) => {
    for (const mapping of mappings) {
      const sourceSubjectName = mapping.sourceSubjectName.trim();
      const sourceTopicName = mapping.sourceTopicName.trim();

      if (
        !sourceSubjectName ||
        !sourceTopicName ||
        !mapping.questSubjectId ||
        !mapping.questTopicId
      ) {
        throw new Error(
          "Dados incompletos para armazenar a equivalência semântica.",
        );
      }

      if (
        !Number.isFinite(mapping.confidence) ||
        mapping.confidence < 0 ||
        mapping.confidence > 1
      ) {
        throw new Error(
          "Confiança inválida para armazenar a equivalência.",
        );
      }

      const normalizedSourceSubject =
        normalizeSearchTerm(sourceSubjectName);

      const normalizedSourceTopic =
        normalizeSearchTerm(sourceTopicName);

      const existing = await tx.semanticMapping.findUnique({
        where: {
          normalized_source_subject_normalized_source_topic: {
            normalized_source_subject: normalizedSourceSubject,
            normalized_source_topic: normalizedSourceTopic,
          },
        },
      });

      // Preserva decisões que já foram aprovadas ou rejeitadas.
      if (
        existing &&
        existing.status !== "PENDING"
      ) {
        result.preserved++;
        continue;
      }

      const data = {
        source_subject_name: sourceSubjectName,
        source_topic_name: sourceTopicName,
        normalized_source_subject: normalizedSourceSubject,
        normalized_source_topic: normalizedSourceTopic,
        quest_subject_id: mapping.questSubjectId,
        quest_topic_id: mapping.questTopicId,
        confidence: mapping.confidence,
        method: "AI" as const,
        status: "PENDING" as const,
        model: mapping.model ?? model,
      };

      if (existing) {
        await tx.semanticMapping.update({
          where: {
            id: existing.id,
          },
          data,
        });

        result.updated++;
      } else {
        await tx.semanticMapping.create({
          data,
        });

        result.created++;
      }
    }
  });

  return result;
}


/**
 * Busca equivalências previamente aprovadas.
 *
 * Só retorna registros:
 * - com status APPROVED;
 * - vinculados à matéria de catálogo informada;
 * - cuja matéria e assunto ainda estejam ativos.
 */
// export async function findApprovedSemanticMappings(
//   sourceSubjectName: string,
//   sourceTopicNames: string[],
//   questSubjectId: string,
// ) {
//   const normalizedSubject = normalizeSearchTerm(sourceSubjectName);

//   const normalizedTopics = [
//     ...new Set(
//       sourceTopicNames
//         .map(normalizeSearchTerm)
//         .filter(Boolean),
//     ),
//   ];

//   if (normalizedTopics.length === 0) {
//     return [];
//   }

//   return questCatalogPrisma.semanticMapping.findMany({
//     where: {
//       normalized_source_subject: normalizedSubject,

//       normalized_source_topic: {
//         in: normalizedTopics,
//       },

//       quest_subject_id: questSubjectId,

//       status: "APPROVED",

//       quest_subject: {
//         is: {
//           is_active: true,
//         },
//       },

//       quest_topic: {
//         is: {
//           is_active: true,
//           subject_id: questSubjectId,
//         },
//       },
//     },

//     select: {
//       source_topic_name: true,
//       normalized_source_topic: true,
//       confidence: true,

//       quest_topic: {
//         select: {
//           id: true,
//           name: true,
//           subject_id: true,
//         },
//       },
//     },
//   });
// }


export async function findApprovedSemanticMappings(
  sourceSubjectName: string,
  sourceTopicNames: string[],
) {
  const normalizedSubject = normalizeSearchTerm(sourceSubjectName);

  const normalizedTopics = [
    ...new Set(
      sourceTopicNames
        .map(normalizeSearchTerm)
        .filter(Boolean),
    ),
  ];

  if (normalizedTopics.length === 0) {
    return [];
  }

  return questCatalogPrisma.semanticMapping.findMany({
    where: {
      normalized_source_subject: normalizedSubject,

      normalized_source_topic: {
        in: normalizedTopics,
      },

      status: "APPROVED",

      quest_subject: {
        is: {
          is_active: true,
        },
      },

      quest_topic: {
        is: {
          is_active: true,
        },
      },
    },

    select: {
      source_topic_name: true,
      normalized_source_topic: true,
      quest_subject_id: true,
      confidence: true,

      quest_subject: {
        select: {
          id: true,
          name: true,
        },
      },

      quest_topic: {
        select: {
          id: true,
          name: true,
          subject_id: true,
        },
      },
    },
  });
}

