import { prisma } from "../../lib/prisma.js";
import type { QuestApiQuestion } from "./providers/quest-api/interfaces/questions.interface.js";

const SOURCE_PROVIDER = "quest-api";

export type PersistQuestQuestionsResult = {
  created: number;
  updated: number;
  questions: Array<{
    externalId: string;
    questionId: string;
  }>;
};

/**
 * Persiste questões retornadas pela Quest API.
 * A chave source_provider + external_id torna a operação idempotente:
 * importar novamente a mesma questão atualiza o registro existente.
 */
export async function persistQuestQuestions(
  items: QuestApiQuestion[],
): Promise<PersistQuestQuestionsResult> {
  const result: PersistQuestQuestionsResult = {
    created: 0,
    updated: 0,
    questions: [],
  };

  for (const item of items) {
    const externalId = item.id?.trim();
    const statement = item.enunciado?.trim();

    if (!externalId || !statement) {
      throw new Error("Quest API retornou uma questão sem ID ou enunciado.");
    }

    const subjectName = item.classificacao?.materia?.trim() || null;
    const topicName = item.classificacao?.assunto?.trim() || null;

    if (externalId.length > 200) {
      throw new Error(`ID externo maior que 200 caracteres: ${externalId}`);
    }
    if (subjectName && subjectName.length > 200) {
      throw new Error(`Matéria maior que 200 caracteres na questão ${externalId}.`);
    }
    if (topicName && topicName.length > 400) {
      throw new Error(`Assunto maior que 400 caracteres na questão ${externalId}.`);
    }

    const alternatives = (item.alternativas ?? []).map((alternative, index) => {
      const label = alternative.letra?.trim().toUpperCase();
      const content = alternative.texto ?? "";

      if (!label || label.length > 10) {
        throw new Error(`Alternativa com identificador inválido na questão ${externalId}.`);
      }

      if (!content.trim()) {
        throw new Error(`Alternativa ${label} sem conteúdo na questão ${externalId}.`);
      }

      return {
        label,
        content,
        sortOrder: index,
      };
    });

    const labels = alternatives.map((alternative) => alternative.label);
    if (new Set(labels).size !== labels.length) {
      throw new Error(`A questão ${externalId} possui letras de alternativas duplicadas.`);
    }

    const answerKey = item.anulada
      ? null
      : item.gabarito?.trim().toUpperCase() || null;

    const persisted = await prisma.$transaction(async (tx) => {
      const where = {
        source_provider_external_id: {
          source_provider: SOURCE_PROVIDER,
          external_id: externalId,
        },
      };

      const existing = await tx.questions.findUnique({
        where,
        select: { id: true },
      });

      const question = await tx.questions.upsert({
        where,
        create: {
          source_provider: SOURCE_PROVIDER,
          external_id: externalId,
          statement,
          source_name: "Quest API",
          subject_name: subjectName,
          topic_name: topicName,
          difficulty:
            Number.isInteger(item.dificuldade) &&
            item.dificuldade >= -32768 &&
            item.dificuldade <= 32767
              ? item.dificuldade
              : null,
          last_synced_at: new Date(),
        },
        update: {
          statement,
          source_name: "Quest API",
          subject_name: subjectName,
          topic_name: topicName,
          difficulty:
            Number.isInteger(item.dificuldade) &&
            item.dificuldade >= -32768 &&
            item.dificuldade <= 32767
              ? item.dificuldade
              : null,
          last_synced_at: new Date(),
        },
        select: { id: true },
      });

      // Desmarca primeiro a alternativa correta anterior para respeitar
      // o índice único parcial que permite no máximo uma alternativa correta.
      await tx.question_options.updateMany({
        where: { question_id: question.id },
        data: { is_correct: false },
      });

      // Atualiza ou cria alternativas sem trocar seus IDs, preservando
      // referências existentes em answers.
      for (const alternative of alternatives) {
        const isCorrect = answerKey === alternative.label;

        const existingAlternative = await tx.question_options.findUnique({
          where: {
            question_id_label: {
              question_id: question.id,
              label: alternative.label,
            },
          },
          select: { id: true },
        });

        const alternativeData = {
          content: alternative.content,
          is_correct: isCorrect,
          sort_order: alternative.sortOrder,
        };

        if (existingAlternative) {
          // Atualiza pelo ID para preservar a identidade da alternativa e
          // referências existentes na tabela answers.
          await tx.question_options.update({
            where: { id: existingAlternative.id },
            data: alternativeData,
          });
        } else {
          // Cria somente quando a alternativa ainda não existe.
          // Evita o ON CONFLICT do upsert, que está falhando no banco atual.
          await tx.question_options.create({
            data: {
              question_id: question.id,
              label: alternative.label,
              ...alternativeData,
            },
          });
        }
      }

      return {
        id: question.id,
        created: existing === null,
      };
    });

    if (persisted.created) {
      result.created += 1;
    } else {
      result.updated += 1;
    }

    result.questions.push({
      externalId,
      questionId: persisted.id,
    });
  }

  return result;
}
