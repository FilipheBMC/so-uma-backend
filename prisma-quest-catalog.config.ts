import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma-quest-catalog/schema.prisma",

  migrations: {
    path: "prisma-quest-catalog/migrations",
  },

  datasource: {
    url: env("QUEST_CATALOG_DATABASE_URL"),
  },
});
