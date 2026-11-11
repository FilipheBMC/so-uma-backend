import type { StudyOrchestratorInput } from "./study-preparation.types.js";

export function organizer(input: StudyOrchestratorInput) {
    switch (input.source) {
        case "edital": {
            const { data } = input;

            const subjects = data.subjects.map((subject) => ({
                name: subject.name,
                group: subject.group,
                amount: subject.questionCount,
            }));

            // Percorre cada grupo identificado pela IA.
            for (const group of data.groups) {
                if (group.questionCount === null) {
                    continue;
                }

                // Identifica as matérias pertencentes ao grupo.
                const groupSubjects = subjects.filter(
                    (subject) => subject.group === group.name,
                );

                if (groupSubjects.length === 0) {
                    continue;
                }

                // Soma as quantidades individuais já informadas.
                const alreadyAssigned = groupSubjects.reduce(
                    (total, subject) => total + (subject.amount ?? 0),
                    0,
                );

                // Identifica matérias que ainda não possuem quantidade.
                const pendingSubjects = groupSubjects.filter(
                    (subject) => subject.amount === null,
                );

                // Quantidade restante disponível para distribuição.
                const remaining = group.questionCount - alreadyAssigned;

                if (remaining < 0) {
                    throw new Error(
                        `A quantidade individual das matérias ultrapassa o total do grupo ${group.name}.`,
                    );
                }

                if (pendingSubjects.length === 0) {
                    continue;
                }

                // Distribui igualmente entre as matérias pendentes.
                const distribution = distributeQuestions(
                    remaining,
                    pendingSubjects.length,
                );

                pendingSubjects.forEach((subject, index) => {
                    const amount = distribution[index];

                    if (amount === undefined) {
                        throw new Error("Falha ao distribuir questões.");
                    }

                    subject.amount = amount;
                });
            }

            return {
                source: "edital",
                totalQuestions: data.totalQuestions,
                groups: data.groups,
                subjects,
            };
        }
        case "manual": {
            const { data } = input;

            return {
                source: "manual",
                totalQuestions: data.amount,
                groups: [],
                subjects: [
                    {
                        name: data.subject,
                        group: null,
                        amount: data.amount,
                    },
                ],
            };
        }
    }
};


function distributeQuestions(
    total: number,
    subjectCount: number,
): number[] {
    const base = Math.floor(total / subjectCount);
    const remainder = total % subjectCount;

    return Array.from(
        { length: subjectCount },
        (_, index) => base + (index < remainder ? 1 : 0),
    );
}