
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/quest-catalog/client.js";

const connectionString = process.env.QUEST_CATALOG_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "QUEST_CATALOG_DATABASE_URL não foi configurada.",
  );
}

const adapter = new PrismaPg({ connectionString });

export const questCatalogPrisma = new PrismaClient({ adapter });
