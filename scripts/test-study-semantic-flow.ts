
// import "dotenv/config";

// import { studyOrchestror } from "../src/modules/study/study-preparation.service.js";
// import { questCatalogPrisma } from "../src/lib/questCatalogPrisma.js";

// async function main(): Promise<void> {
//   console.log("\n======================================");
//   console.log(" TESTE INTEGRADO DO SÓ UMA?");
//   console.log("======================================");

//   const result = await studyOrchestror({
//     subjects: [
//       {
//         materia: "Administração Geral",
//         topics: [
//           "Administração de Recursos Humanos",
//         ],
//         amountQuestions: 1,
//       },
//     ],
//   });

//   console.log("\n========== CORRESPONDÊNCIA SEMÂNTICA ==========\n");

//   console.dir(result.semanticMatches, {
//     depth: null,
//     colors: true,
//   });

//   console.log("\n========== QUESTÕES RECUPERADAS ==========\n");

//   console.dir(result.questions, {
//     depth: 4,
//     colors: true,
//   });

//   console.log("\n========== NOTIFICAÇÕES ==========\n");

//   console.dir(result.notifications, {
//     depth: null,
//     colors: true,
//   });

//   const totalQuestions = result.questions.reduce(
//     (total, item) => total + item.questions.data.items.length,
//     0,
//   );

//   console.log("\n========== RESUMO ==========\n");

//   console.log("Matéria solicitada: Administração Geral");
//   console.log("Assunto original: Administração de Recursos Humanos");
//   console.log("Assunto utilizado na Quest API: Gestão de Pessoas");
//   console.log("Questões recuperadas:", totalQuestions);
// }

// main()
//   .catch((error: unknown) => {
//     console.error("\nErro no teste integrado:", error);
//     process.exitCode = 1;
//   })
//   .finally(async () => {
//     await questCatalogPrisma.$disconnect();
//   });


import "dotenv/config";

import { studyOrchestror } from "../src/modules/study/study-preparation.service.js";
import { questCatalogPrisma } from "../src/lib/questCatalogPrisma.js";
import { prisma } from "../src/lib/prisma.js";

async function main(): Promise<void> {
  console.log("\n======================================");
  console.log(" TESTE INTEGRADO DO SÓ UMA?");
  console.log("======================================");

  // Identificação do usuário que receberá o simulado.
  const userId = process.env.TEST_USER_ID;

  if (!userId) {
    throw new Error(
      "Configure TEST_USER_ID no ambiente antes de executar o teste."
    );
  }

  const result = await studyOrchestror(
    {
      subjects: [
        {
          materia: "Administração Geral",
          topics: [
            "Administração de Recursos Humanos",
          ],
          amountQuestions: 1,
        },
      ],
    },
    userId,
  );

  console.log("\n========== CORRESPONDÊNCIA SEMÂNTICA ==========\n");

  console.dir(result.semanticMatches, {
    depth: null,
    colors: true,
  });

  console.log("\n========== QUESTÕES RECUPERADAS ==========\n");

  console.dir(result.questions, {
    depth: 4,
    colors: true,
  });

  console.log("\n========== SIMULADO PERSISTIDO ==========\n");

  console.dir(result.simulation, {
    depth: null,
    colors: true,
  });

  console.log("\n========== NOTIFICAÇÕES ==========\n");

  console.dir(result.notifications, {
    depth: null,
    colors: true,
  });

  const totalQuestions = result.questions.reduce(
    (total, item) => total + item.questions.data.items.length,
    0,
  );

  console.log("\n========== RESUMO ==========\n");

  console.log("Matéria solicitada: Administração Geral");
  console.log("Assunto original: Administração de Recursos Humanos");
  console.log("Assunto utilizado na Quest API: Gestão de Pessoas");
  console.log("Questões recuperadas:", totalQuestions);
  console.log(
    "Simulado criado:",
    result.simulation ? "Sim" : "Não",
  );

  if (result.simulation) {
    console.log("ID do simulado:", result.simulation.id);
    console.log(
      "Questões associadas:",
      result.simulation.questionCount,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error("\nErro no teste integrado:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([
      prisma.$disconnect(),
      questCatalogPrisma.$disconnect(),
    ]);
  });
