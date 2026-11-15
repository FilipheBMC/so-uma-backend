
import "dotenv/config";

import { questCatalogPrisma } from "../src/lib/questCatalogPrisma.js";

// ======================================================
// CONFIGURAÇÕES
// ======================================================

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} não foi configurada no .env`);
  }

  return value;
}

const apiKey = getRequiredEnv("DB_QUEST");
const apiBaseUrl = getRequiredEnv("LINK_API_QUEST").replace(/\/+$/, "");

const PER_PAGE = 100;
const DATABASE_BATCH_SIZE = 500;
const MAX_ATTEMPTS = 7;

// ======================================================
// TIPOS
// ======================================================

interface CatalogSubjectData {
  name: string;
  topics: string[];
}

interface CatalogSaveResult {
  subjectCreated: number;
  topicsCreated: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

// ======================================================
// FUNÇÕES AUXILIARES
// ======================================================

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }

  return result;
}

function getRetryDelay(
  retryAfter: string | null,
  attempt: number,
): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);

    if (
      retryAfter.trim() !== "" &&
      Number.isFinite(seconds) &&
      seconds >= 0
    ) {
      return seconds * 1000;
    }

    const date = Date.parse(retryAfter);

    if (!Number.isNaN(date)) {
      return Math.max(0, date - Date.now());
    }
  }

  return Math.min(1000 * 2 ** (attempt - 1), 30000);
}

// ======================================================
// COMUNICAÇÃO COM A QUEST API
// ======================================================

async function requestQuestApi(url: string): Promise<unknown> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;

    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
        },
      });
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        throw new Error(
          `Falha de comunicação com a Quest API: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      const delay = getRetryDelay(null, attempt);

      console.warn(
        `Falha de conexão. Nova tentativa em ${Math.ceil(delay / 1000)} segundos.`,
      );

      await sleep(delay);
      continue;
    }

    // HTTP 429: limite de requisições.
    // HTTP 5xx: indisponibilidade temporária do servidor.

    if (
      (response.status === 429 || response.status >= 500) &&
      attempt < MAX_ATTEMPTS
    ) {
      const delay = getRetryDelay(
        response.headers.get("Retry-After"),
        attempt,
      );

      console.warn(
        `Quest API retornou HTTP ${response.status}. Tentativa ${attempt}/${MAX_ATTEMPTS}. Nova tentativa em ${Math.ceil(delay / 1000)} segundos.`,
      );

      await sleep(delay);
      continue;
    }

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        `Quest API retornou HTTP ${response.status}: ${responseText || response.statusText}`,
      );
    }

    try {
      return JSON.parse(responseText) as unknown;
    } catch {
      throw new Error(
        "A Quest API retornou uma resposta que não é um JSON válido.",
      );
    }
  }

  throw new Error("Número máximo de tentativas da Quest API excedido.");
}

// ======================================================
// CONSULTA PAGINADA DE MATÉRIAS E ASSUNTOS
// ======================================================

async function getPaginatedItems(
  endpoint: "materias" | "assuntos",
  filters: Record<string, string> = {},
): Promise<string[]> {
  const items = new Set<string>();

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(`${apiBaseUrl}/filtros/${endpoint}`);

    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(PER_PAGE));

    for (const [key, value] of Object.entries(filters)) {
      url.searchParams.set(key, value);
    }

    const body = await requestQuestApi(url.toString());

    if (!isRecord(body) || !isRecord(body.data)) {
      throw new Error(
        `Resposta inválida ao consultar ${endpoint}, página ${page}.`,
      );
    }

    const rawItems = body.data.items;
    const rawHasMore = body.data.has_more;

    if (
      !Array.isArray(rawItems) ||
      typeof rawHasMore !== "boolean"
    ) {
      throw new Error(
        `Estrutura de paginação inválida em ${endpoint}, página ${page}.`,
      );
    }

    for (const item of rawItems) {
      if (typeof item === "string" && item.trim()) {
        items.add(item.trim());
      }
    }

    console.log(
      `${endpoint}: página ${page} processada. Total encontrado: ${items.size}`,
    );

    hasMore = rawHasMore;

    if (hasMore && rawItems.length === 0) {
      throw new Error(
        `A API informou has_more, mas retornou uma página vazia em ${endpoint}.`,
      );
    }

    page++;
  }

  return [...items];
}

// ======================================================
// BUSCA DAS MATÉRIAS
// ======================================================

async function fetchSubjects(): Promise<string[]> {
  console.log("\nBuscando matérias na Quest API...\n");

  const subjects = await getPaginatedItems("materias");

  if (subjects.length === 0) {
    throw new Error(
      "A Quest API retornou zero matérias. A sincronização foi interrompida.",
    );
  }

  console.log(`\nTotal de matérias encontradas: ${subjects.length}`);

  return subjects;
}

// ======================================================
// GERENCIAMENTO DO HISTÓRICO DE SINCRONIZAÇÃO
// ======================================================

async function getOrCreateSyncRun() {
  // Procura uma sincronização que foi interrompida
  // ou que terminou com erro.

  const previousRun = await questCatalogPrisma.catalogSyncRun.findFirst({
    where: {
      status: {
        in: ["RUNNING", "FAILED"],
      },
    },
    orderBy: {
      started_at: "desc",
    },
  });

  if (previousRun) {
    console.log("\nSincronização anterior encontrada.");
    console.log("Tentando retomar o processamento...");

    return questCatalogPrisma.catalogSyncRun.update({
      where: {
        id: previousRun.id,
      },
      data: {
        status: "RUNNING",
        error_message: null,
        finished_at: null,
      },
    });
  }

  console.log("\nCriando novo registro de sincronização...");

  return questCatalogPrisma.catalogSyncRun.create({
    data: {
      status: "RUNNING",
    },
  });
}

// ======================================================
// GRAVAÇÃO INDIVIDUAL DE UMA MATÉRIA
// ======================================================

async function saveSubject(
  subjectName: string,
  topics: string[],
  syncRunId: string,
): Promise<CatalogSaveResult> {
  const now = new Date();

  // Cada matéria é salva em sua própria transação.
  // O checkpoint e os registros são confirmados juntos.

  return questCatalogPrisma.$transaction(
    async (tx): Promise<CatalogSaveResult> => {
      const existingSubject = await tx.questCatalogSubject.findUnique({
        where: {
          name: subjectName,
        },
        select: {
          id: true,
        },
      });

      // Insere uma matéria nova ou atualiza a existente.

      const subject = await tx.questCatalogSubject.upsert({
        where: {
          name: subjectName,
        },
        create: {
          name: subjectName,
          normalized_name: normalizeName(subjectName),
          is_active: true,
          last_seen_at: now,
        },
        update: {
          normalized_name: normalizeName(subjectName),
          is_active: true,
          last_seen_at: now,
        },
      });

      const subjectCreated = existingSubject ? 0 : 1;

      // Os assuntos anteriores dessa matéria ficam inativos.
      // Os assuntos retornados agora serão reativados abaixo.

      await tx.questCatalogTopic.updateMany({
        where: {
          subject_id: subject.id,
        },
        data: {
          is_active: false,
        },
      });

      let topicsCreated = 0;

      // Insere e atualiza assuntos em lotes.

      for (const batch of chunk(topics, DATABASE_BATCH_SIZE)) {
        const result = await tx.questCatalogTopic.createMany({
          data: batch.map((topicName) => ({
            subject_id: subject.id,
            name: topicName,
            normalized_name: normalizeName(topicName),
            is_active: true,
            last_seen_at: now,
          })),
          skipDuplicates: true,
        });

        topicsCreated += result.count;

        // Reativa também os assuntos que já existiam.

        await tx.questCatalogTopic.updateMany({
          where: {
            subject_id: subject.id,
            name: {
              in: batch,
            },
          },
          data: {
            is_active: true,
            last_seen_at: now,
          },
        });
      }

      // Atualiza o histórico na mesma transação.
      // Se a transação falhar, o checkpoint também será revertido.

      await tx.catalogSyncRun.update({
        where: {
          id: syncRunId,
        },
        data: {
          subjects_processed: {
            increment: 1,
          },
          topics_processed: {
            increment: topics.length,
          },
          subjects_created: {
            increment: subjectCreated,
          },
          topics_created: {
            increment: topicsCreated,
          },
          last_subject_name: subjectName,
        },
      });

      return {
        subjectCreated,
        topicsCreated,
      };
    },
    {
      maxWait: 10000,
      timeout: 120000,
    },
  );
}

// ======================================================
// FINALIZAÇÃO DA SINCRONIZAÇÃO
// ======================================================

async function finalizeSync(
  syncRunId: string,
  subjectNames: string[],
): Promise<void> {
  await questCatalogPrisma.$transaction(async (tx) => {
    // Desativa matérias que não apareceram na consulta completa.

    await tx.questCatalogSubject.updateMany({
      where: {
        name: {
          notIn: subjectNames,
        },
        is_active: true,
      },
      data: {
        is_active: false,
      },
    });

    // Desativa também os assuntos pertencentes
    // às matérias que foram desativadas.

    const inactiveSubjects = await tx.questCatalogSubject.findMany({
      where: {
        is_active: false,
      },
      select: {
        id: true,
      },
    });

    const inactiveSubjectIds = inactiveSubjects.map(
      (subject) => subject.id,
    );

    for (const batch of chunk(
      inactiveSubjectIds,
      DATABASE_BATCH_SIZE,
    )) {
      await tx.questCatalogTopic.updateMany({
        where: {
          subject_id: {
            in: batch,
          },
        },
        data: {
          is_active: false,
        },
      });
    }

    // Marca a sincronização como concluída.

    await tx.catalogSyncRun.update({
      where: {
        id: syncRunId,
      },
      data: {
        status: "SUCCEEDED",
        finished_at: new Date(),
        error_message: null,
      },
    });
  });
}

// ======================================================
// EXECUÇÃO PRINCIPAL
// ======================================================

async function main(): Promise<void> {
  let syncRunId: string | undefined;

  try {
    console.log("========================================");
    console.log(" SINCRONIZAÇÃO DO CATÁLOGO QUEST API");
    console.log("========================================");

    // 1. Obtém ou cria o histórico da sincronização.

    let syncRun = await getOrCreateSyncRun();

    syncRunId = syncRun.id;

    // 2. Busca todas as matérias.

    const subjects = await fetchSubjects();

    // 3. Identifica de onde deve continuar.

    let startIndex = 0;

    if (syncRun.last_subject_name) {
      const checkpointIndex = subjects.indexOf(
        syncRun.last_subject_name,
      );

      if (checkpointIndex >= 0) {
        startIndex = checkpointIndex + 1;

        console.log(
          `\nÚltima matéria concluída: ${syncRun.last_subject_name}`,
        );

        console.log(
          `Retomando na posição ${startIndex + 1} de ${subjects.length}.`,
        );
      } else {
        // O checkpoint não existe mais na lista atual.
        // Reinicia a contagem para evitar pular matérias.

        console.warn(
          "\nO checkpoint anterior não foi encontrado na API.",
        );

        console.warn(
          "A sincronização será reiniciada desde a primeira matéria.",
        );

        syncRun = await questCatalogPrisma.catalogSyncRun.update({
          where: {
            id: syncRunId,
          },
          data: {
            last_subject_name: null,
            subjects_processed: 0,
            topics_processed: 0,
            subjects_created: 0,
            topics_created: 0,
            started_at: new Date(),
          },
        });
      }
    }

    // 4. Processa cada matéria individualmente.

    for (const [index, subjectName] of subjects.entries()) {
      if (index < startIndex) {
        continue;
      }

      console.log(
        `\n[${index + 1}/${subjects.length}] Consultando: ${subjectName}`,
      );

      // Busca todos os assuntos da matéria.
      // Se ocorrer erro aqui, o checkpoint anterior permanece.

      const topics = await getPaginatedItems("assuntos", {
        materia: subjectName,
      });

      // Salva matéria, assuntos e checkpoint em uma transação.

      const result = await saveSubject(
        subjectName,
        topics,
        syncRunId,
      );

      if (
        (index + 1) % 25 === 0 ||
        index === subjects.length - 1
      ) {
        console.log("\nProgresso confirmado no banco:");
        console.log(`Matérias processadas: ${index + 1}`);
        console.log(`Assuntos desta matéria: ${topics.length}`);
        console.log(`Matérias novas: ${result.subjectCreated}`);
        console.log(`Assuntos novos: ${result.topicsCreated}`);
      }
    }

    // 5. Somente depois de todas as matérias,
    // desativa registros que não existem mais na API.

    console.log("\nTodas as matérias foram processadas.");
    console.log("Finalizando catálogo...");

    await finalizeSync(syncRunId, subjects);

    // 6. Recupera o resumo definitivo.

    const finalRun = await questCatalogPrisma.catalogSyncRun.findUnique({
      where: {
        id: syncRunId,
      },
    });

    console.log("\n========================================");
    console.log(" SINCRONIZAÇÃO CONCLUÍDA");
    console.log("========================================");

    console.log(`Matérias processadas: ${finalRun?.subjects_processed}`);
    console.log(`Assuntos processados: ${finalRun?.topics_processed}`);
    console.log(`Matérias novas: ${finalRun?.subjects_created}`);
    console.log(`Assuntos novos: ${finalRun?.topics_created}`);

  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error("\n========================================");
    console.error(" FALHA NA SINCRONIZAÇÃO");
    console.error("========================================");

    console.error(message);

    // Não apaga os dados já confirmados.
    // O último checkpoint permanece salvo.

    if (syncRunId) {
      try {
        await questCatalogPrisma.catalogSyncRun.update({
          where: {
            id: syncRunId,
          },
          data: {
            status: "FAILED",
            finished_at: new Date(),
            error_message: message,
          },
        });
      } catch (updateError) {
        console.error(
          "Não foi possível atualizar o histórico:",
          updateError,
        );
      }
    }

    process.exitCode = 1;

  } finally {
    await questCatalogPrisma.$disconnect();
  }
}

void main();
