import { prisma } from "../../lib/prisma.js";

const QUEST_API_PROVIDER = "quest-api";
const ATTEMPT_IN_PROGRESS = "IN_PROGRESS";
const ATTEMPT_SUBMITTED = "SUBMITTED";

export class SimulationNotFoundError extends Error {
  constructor() {
    super("Simulado não encontrado para o usuário autenticado.");
    this.name = "SimulationNotFoundError";
  }
}

export class AttemptNotFoundError extends Error {
  constructor() {
    super("Tentativa não encontrada para o usuário autenticado.");
    this.name = "AttemptNotFoundError";
  }
}

export class InvalidAttemptStateError extends Error {
  constructor(message = "Esta tentativa não está mais aberta para respostas.") {
    super(message);
    this.name = "InvalidAttemptStateError";
  }
}

export class InvalidAttemptAnswerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAttemptAnswerError";
  }
}

type StartSimulationAttemptInput = {
  simulationId: string;
  userId: string;
};

export async function startSimulationAttempt({
  simulationId,
  userId,
}: StartSimulationAttemptInput) {
  const simulation = await prisma.simulations.findFirst({
    where: {
      id: simulationId,
      user_id: userId,
    },
    select: {
      id: true,
      simulation_questions: {
        select: { question_id: true },
      },
    },
  });

  if (!simulation) {
    throw new SimulationNotFoundError();
  }

  if (simulation.simulation_questions.length === 0) {
    throw new InvalidAttemptAnswerError(
      "Não é possível iniciar um simulado sem questões.",
    );
  }

  const attempt = await prisma.attempts.create({
    data: {
      simulation_id: simulation.id,
      user_id: userId,
      status: ATTEMPT_IN_PROGRESS,
    },
    select: {
      id: true,
      simulation_id: true,
      status: true,
      started_at: true,
    },
  });

  return {
    id: attempt.id,
    simulationId: attempt.simulation_id,
    status: attempt.status,
    startedAt: attempt.started_at,
  };
}

type SaveSimulationAnswerInput = {
  attemptId: string;
  userId: string;
  questionExternalId: string;
  selectedAlternativeLetter: string;
  timeSpentSeconds?: number;
};

/**
 * Recebe a identificação externa da questão e a letra escolhida.
 * O gabarito nunca é recebido do frontend: a comparação é feita com
 * question_options.is_correct no PostgreSQL.
 */
export async function saveSimulationAnswer({
  attemptId,
  userId,
  questionExternalId,
  selectedAlternativeLetter,
  timeSpentSeconds,
}: SaveSimulationAnswerInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const attempt = await tx.attempts.findFirst({
      where: {
        id: attemptId,
        user_id: userId,
      },
      select: {
        id: true,
        simulation_id: true,
        status: true,
      },
    });

    if (!attempt) {
      throw new AttemptNotFoundError();
    }

    if (attempt.status !== ATTEMPT_IN_PROGRESS) {
      throw new InvalidAttemptStateError();
    }

    const question = await tx.questions.findFirst({
      where: {
        source_provider: QUEST_API_PROVIDER,
        external_id: questionExternalId,
      },
      select: {
        id: true,
        question_options: {
          select: {
            id: true,
            label: true,
            is_correct: true,
          },
        },
      },
    });

    if (!question) {
      throw new InvalidAttemptAnswerError(
        "A questão informada não está cadastrada.",
      );
    }

    const includedQuestion = await tx.simulation_questions.findUnique({
      where: {
        simulation_id_question_id: {
          simulation_id: attempt.simulation_id,
          question_id: question.id,
        },
      },
      select: { question_id: true },
    });

    if (!includedQuestion) {
      throw new InvalidAttemptAnswerError(
        "A questão não pertence ao simulado desta tentativa.",
      );
    }

    const normalizedLetter = selectedAlternativeLetter.trim().toUpperCase();
    const selectedOption = question.question_options.find(
      (option) => option.label.toUpperCase() === normalizedLetter,
    );

    if (!selectedOption) {
      throw new InvalidAttemptAnswerError(
        "A alternativa selecionada não pertence à questão.",
      );
    }

    const hasAnswerKey = question.question_options.some(
      (option) => option.is_correct,
    );

    const correctness = hasAnswerKey ? selectedOption.is_correct : null;

    const timingData =
      timeSpentSeconds === undefined
        ? {}
        : { time_spent_seconds: timeSpentSeconds };

    await tx.answers.upsert({
      where: {
        attempt_id_question_id: {
          attempt_id: attempt.id,
          question_id: question.id,
        },
      },
      create: {
        attempt_id: attempt.id,
        question_id: question.id,
        selected_option_id: selectedOption.id,
        is_correct: correctness,
        ...timingData,
      },
      update: {
        selected_option_id: selectedOption.id,
        is_correct: correctness,
        answered_at: new Date(),
        ...timingData,
      },
    });
  });
}

export async function finishSimulationAttempt(
  attemptId: string,
  userId: string,
) {
  const attempt = await prisma.attempts.findFirst({
    where: {
      id: attemptId,
      user_id: userId,
    },
    select: {
      id: true,
      status: true,
      submitted_at: true,
    },
  });

  if (!attempt) {
    throw new AttemptNotFoundError();
  }

  // Permite repetir a chamada sem finalizar uma tentativa duas vezes.
  if (attempt.status === ATTEMPT_SUBMITTED) {
    return {
      id: attempt.id,
      status: attempt.status,
      submittedAt: attempt.submitted_at,
    };
  }

  if (attempt.status !== ATTEMPT_IN_PROGRESS) {
    throw new InvalidAttemptStateError();
  }

  const submittedAt = new Date();
  const updated = await prisma.attempts.update({
    where: { id: attempt.id },
    data: {
      status: ATTEMPT_SUBMITTED,
      submitted_at: submittedAt,
    },
    select: {
      id: true,
      status: true,
      submitted_at: true,
    },
  });

  return {
    id: updated.id,
    status: updated.status,
    submittedAt: updated.submitted_at,
  };
}
