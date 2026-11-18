import { prisma } from "../../lib/prisma.js";

const ATTEMPT_SUBMITTED = "SUBMITTED";

type AggregateRow = {
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  ungradedQuestions: number;
  evaluatedQuestions: number;
};

type PerformanceRow = {
  name: string;
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  evaluatedQuestions: number;
};

type MonthlyEvolutionRow = {
  month: string;
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  evaluatedQuestions: number;
};

function calculateAccuracy(correct: number, evaluated: number): number | null {
  if (evaluated === 0) return null;
  return Math.round((correct / evaluated) * 100);
}

function mapPerformanceRow(row: PerformanceRow) {
  return {
    ...row,
    accuracyPercent: calculateAccuracy(
      row.correctAnswers,
      row.evaluatedQuestions,
    ),
  };
}

/**
 * Retorna estatísticas do usuário autenticado. Apenas tentativas SUBMITTED
 * entram nos indicadores, para que simulados em andamento não distorçam
 * o histórico de desempenho.
 */
export async function getDashboardStatistics(userId: string) {
  const [
    completedSimulations,
    aggregateRows,
    subjectRows,
    topicRows,
    monthlyRows,
    attempts,
  ] = await Promise.all([
      prisma.attempts.count({
        where: {
          user_id: userId,
          status: ATTEMPT_SUBMITTED,
        },
      }),
      prisma.$queryRaw<AggregateRow[]>`
        SELECT
          COUNT(*)::int AS "answeredQuestions",
          COUNT(*) FILTER (WHERE a.is_correct IS TRUE)::int AS "correctAnswers",
          COUNT(*) FILTER (WHERE a.is_correct IS FALSE)::int AS "incorrectAnswers",
          COUNT(*) FILTER (WHERE a.is_correct IS NULL)::int AS "ungradedQuestions",
          COUNT(*) FILTER (WHERE a.is_correct IS NOT NULL)::int AS "evaluatedQuestions"
        FROM answers a
        INNER JOIN attempts t ON t.id = a.attempt_id
        WHERE t.user_id = ${userId}::uuid
          AND t.status = ${ATTEMPT_SUBMITTED}
      `,
      prisma.$queryRaw<PerformanceRow[]>`
        SELECT
          COALESCE(NULLIF(BTRIM(q.subject_name), ''), 'Sem disciplina') AS name,
          COUNT(*)::int AS "answeredQuestions",
          COUNT(*) FILTER (WHERE a.is_correct IS TRUE)::int AS "correctAnswers",
          COUNT(*) FILTER (WHERE a.is_correct IS FALSE)::int AS "incorrectAnswers",
          COUNT(*) FILTER (WHERE a.is_correct IS NOT NULL)::int AS "evaluatedQuestions"
        FROM answers a
        INNER JOIN attempts t ON t.id = a.attempt_id
        INNER JOIN questions q ON q.id = a.question_id
        WHERE t.user_id = ${userId}::uuid
          AND t.status = ${ATTEMPT_SUBMITTED}
        GROUP BY COALESCE(NULLIF(BTRIM(q.subject_name), ''), 'Sem disciplina')
        HAVING COUNT(*) FILTER (WHERE a.is_correct IS NOT NULL) > 0
        ORDER BY "evaluatedQuestions" DESC, "answeredQuestions" DESC
        LIMIT 8
      `,
      prisma.$queryRaw<PerformanceRow[]>`
        SELECT
          (COALESCE(NULLIF(BTRIM(q.subject_name), ''), 'Sem disciplina') || ' · ' ||
            COALESCE(NULLIF(BTRIM(q.topic_name), ''), 'Sem tópico')) AS name,
          COUNT(*)::int AS "answeredQuestions",
          COUNT(*) FILTER (WHERE a.is_correct IS TRUE)::int AS "correctAnswers",
          COUNT(*) FILTER (WHERE a.is_correct IS FALSE)::int AS "incorrectAnswers",
          COUNT(*) FILTER (WHERE a.is_correct IS NOT NULL)::int AS "evaluatedQuestions"
        FROM answers a
        INNER JOIN attempts t ON t.id = a.attempt_id
        INNER JOIN questions q ON q.id = a.question_id
        WHERE t.user_id = ${userId}::uuid
          AND t.status = ${ATTEMPT_SUBMITTED}
        GROUP BY
          COALESCE(NULLIF(BTRIM(q.subject_name), ''), 'Sem disciplina'),
          COALESCE(NULLIF(BTRIM(q.topic_name), ''), 'Sem tópico')
        HAVING COUNT(*) FILTER (WHERE a.is_correct IS NOT NULL) > 0
        ORDER BY
          (COUNT(*) FILTER (WHERE a.is_correct IS TRUE)::numeric / NULLIF(COUNT(*) FILTER (WHERE a.is_correct IS NOT NULL), 0)) ASC,
          "evaluatedQuestions" DESC
        LIMIT 8
      `,
      prisma.$queryRaw<MonthlyEvolutionRow[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', t.submitted_at), 'MM/YYYY') AS month,
          COUNT(a.id)::int AS "answeredQuestions",
          COUNT(*) FILTER (WHERE a.is_correct IS TRUE)::int AS "correctAnswers",
          COUNT(*) FILTER (WHERE a.is_correct IS FALSE)::int AS "incorrectAnswers",
          COUNT(*) FILTER (WHERE a.is_correct IS NOT NULL)::int AS "evaluatedQuestions"
        FROM attempts t
        LEFT JOIN answers a ON a.attempt_id = t.id
        WHERE t.user_id = ${userId}::uuid
          AND t.status = ${ATTEMPT_SUBMITTED}
          AND t.submitted_at IS NOT NULL
          AND t.submitted_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
        GROUP BY DATE_TRUNC('month', t.submitted_at)
        ORDER BY DATE_TRUNC('month', t.submitted_at) ASC
      `,
      prisma.attempts.findMany({
        where: {
          user_id: userId,
          status: ATTEMPT_SUBMITTED,
        },
        orderBy: {
          submitted_at: "desc",
        },
        take: 5,
        select: {
          id: true,
          started_at: true,
          submitted_at: true,
          simulations: {
            select: { title: true },
          },
          answers: {
            select: { is_correct: true },
          },
        },
      }),
    ]);

  const aggregate = aggregateRows[0] ?? {
    answeredQuestions: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    ungradedQuestions: 0,
    evaluatedQuestions: 0,
  };

  const recentAttempts = attempts.map((attempt) => {
    const correctAnswers = attempt.answers.filter(
      (answer) => answer.is_correct === true,
    ).length;
    const incorrectAnswers = attempt.answers.filter(
      (answer) => answer.is_correct === false,
    ).length;
    const evaluatedQuestions = correctAnswers + incorrectAnswers;
    const submittedAt = attempt.submitted_at;

    return {
      id: attempt.id,
      title: attempt.simulations.title,
      startedAt: attempt.started_at,
      submittedAt,
      answeredQuestions: attempt.answers.length,
      correctAnswers,
      incorrectAnswers,
      accuracyPercent: calculateAccuracy(
        correctAnswers,
        evaluatedQuestions,
      ),
    };
  });

  return {
    generatedAt: new Date(),
    summary: {
      completedSimulations,
      answeredQuestions: aggregate.answeredQuestions,
      correctAnswers: aggregate.correctAnswers,
      incorrectAnswers: aggregate.incorrectAnswers,
      ungradedQuestions: aggregate.ungradedQuestions,
      evaluatedQuestions: aggregate.evaluatedQuestions,
      accuracyPercent: calculateAccuracy(
        aggregate.correctAnswers,
        aggregate.evaluatedQuestions,
      ),
    },
    subjects: subjectRows.map(mapPerformanceRow),
    topics: topicRows.map(mapPerformanceRow),
    monthlyEvolution: monthlyRows.map((row) => ({
      ...row,
      accuracyPercent: calculateAccuracy(
        row.correctAnswers,
        row.evaluatedQuestions,
      ),
    })),
    recentAttempts,
  };
}
