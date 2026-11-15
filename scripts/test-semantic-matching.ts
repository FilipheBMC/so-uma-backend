
import "dotenv/config";

import { questCatalogPrisma } from "../src/lib/questCatalogPrisma.js";

import {
  matchSubjectAndTopics,
} from "../src/modules/semantic-matching/semantic-matching.service.js";

async function main(): Promise<void> {
  const [materia, ...topics] = process.argv.slice(2);

  if (!materia || topics.length === 0) {
    throw new Error(
      'Informe uma matéria e pelo menos um assunto. Exemplo: npx tsx scripts/test-semantic-matching.ts "Noções de Direito Administrativo" "Princípios da Administração Pública"',
    );
  }

  console.log("\nIniciando teste semântico...\n");

  const result = await matchSubjectAndTopics({
    materia,
    topics,
  });

  console.log("\n========== RESULTADO ==========\n");

  console.dir(result, {
    depth: null,
    colors: true,
  });

  console.log("\n========== RESUMO ==========\n");

  console.log("Matéria original:", result.originalSubject);

  console.log(
    "Matéria encontrada:",
    result.subjectMatch.catalogName ?? "Não encontrada",
  );

  console.log(
    "Confiança:",
    result.subjectMatch.confidence,
  );

  console.log(
    "Assuntos correspondentes:",
    result.topics.filter((topic) => topic.status === "MATCHED").length,
  );

  console.log(
    "Assuntos não encontrados:",
    result.topics.filter((topic) => topic.status === "NO_MATCH").length,
  );
}

main()
  .catch((error: unknown) => {
    console.error("\nErro no teste semântico:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await questCatalogPrisma.$disconnect();
  });
