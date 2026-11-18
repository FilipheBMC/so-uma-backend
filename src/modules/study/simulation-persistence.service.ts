import { prisma } from "../../lib/prisma.js";

type CreateStudySimulationInput = {
  userId: string;
  subjectNames: string[];
  questionIds: string[];
};

export type CreateStudySimulationResult = {
  id: string;
  title: string;
  created_at: Date;
  questionCount: number;
};

/**
 * Cria um simulado personalizado e associa a ele as questões já persistidas.
 * Cada chamada cria um novo simulado; questões repetidas são removidas antes
 * da associação para respeitar a chave composta da tabela simulation_questions.
 */
export async function createStudySimulation(
  input: CreateStudySimulationInput,
): Promise<CreateStudySimulationResult> {
  const questionIds = Array.from(
    new Set(input.questionIds.filter((id) => id.trim().length > 0)),
  );

  if (questionIds.length === 0) {
    throw new Error("Não é possível criar um simulado sem questões persistidas.");
  }

  if (!input.userId.trim()) {
    throw new Error("Não foi possível identificar o usuário autenticado.");
  }

  const subjectNames = Array.from(
    new Set(input.subjectNames.map((name) => name.trim()).filter(Boolean)),
  );

  const title = (
    subjectNames.length > 0
      ? `Simulado personalizado: ${subjectNames.join(", ")}`
      : "Simulado personalizado"
  ).slice(0, 200);

  return prisma.$transaction(async (tx) => {
    const simulation = await tx.simulations.create({
      data: {
        user_id: input.userId,
        title,
        mode: "CUSTOM",
      },
      select: {
        id: true,
        title: true,
        created_at: true,
      },
    });

    await tx.simulation_questions.createMany({
      data: questionIds.map((questionId, index) => ({
        simulation_id: simulation.id,
        question_id: questionId,
        sort_order: index,
        points: 1,
      })),
    });

    return {
      ...simulation,
      questionCount: questionIds.length,
    };
  });
}
