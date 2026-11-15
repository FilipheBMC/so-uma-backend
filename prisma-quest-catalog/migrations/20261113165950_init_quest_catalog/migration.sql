-- CreateEnum
CREATE TYPE "CatalogSyncStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "SemanticMappingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SemanticMappingMethod" AS ENUM ('EXACT', 'NORMALIZED', 'AI', 'MANUAL');

-- CreateTable
CREATE TABLE "quest_catalog_subjects" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "quest_catalog_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_catalog_topics" (
    "id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "quest_catalog_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_sync_runs" (
    "id" UUID NOT NULL,
    "status" "CatalogSyncStatus" NOT NULL DEFAULT 'RUNNING',
    "subjects_processed" INTEGER NOT NULL DEFAULT 0,
    "topics_processed" INTEGER NOT NULL DEFAULT 0,
    "subjects_created" INTEGER NOT NULL DEFAULT 0,
    "topics_created" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "error_message" TEXT,

    CONSTRAINT "catalog_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semantic_mappings" (
    "id" UUID NOT NULL,
    "source_subject_name" TEXT NOT NULL,
    "source_topic_name" TEXT,
    "normalized_source_subject" TEXT NOT NULL,
    "normalized_source_topic" TEXT,
    "quest_subject_id" UUID NOT NULL,
    "quest_topic_id" UUID,
    "confidence" DECIMAL(5,4),
    "method" "SemanticMappingMethod" NOT NULL DEFAULT 'AI',
    "status" "SemanticMappingStatus" NOT NULL DEFAULT 'PENDING',
    "model" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "semantic_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quest_catalog_subjects_name_key" ON "quest_catalog_subjects"("name");

-- CreateIndex
CREATE INDEX "quest_catalog_subjects_normalized_name_idx" ON "quest_catalog_subjects"("normalized_name");

-- CreateIndex
CREATE INDEX "quest_catalog_subjects_is_active_idx" ON "quest_catalog_subjects"("is_active");

-- CreateIndex
CREATE INDEX "quest_catalog_topics_subject_id_normalized_name_idx" ON "quest_catalog_topics"("subject_id", "normalized_name");

-- CreateIndex
CREATE INDEX "quest_catalog_topics_is_active_idx" ON "quest_catalog_topics"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "quest_catalog_topics_subject_id_name_key" ON "quest_catalog_topics"("subject_id", "name");

-- CreateIndex
CREATE INDEX "catalog_sync_runs_status_started_at_idx" ON "catalog_sync_runs"("status", "started_at");

-- CreateIndex
CREATE INDEX "semantic_mappings_normalized_source_subject_normalized_sour_idx" ON "semantic_mappings"("normalized_source_subject", "normalized_source_topic");

-- CreateIndex
CREATE INDEX "semantic_mappings_quest_subject_id_quest_topic_id_idx" ON "semantic_mappings"("quest_subject_id", "quest_topic_id");

-- CreateIndex
CREATE INDEX "semantic_mappings_status_idx" ON "semantic_mappings"("status");

-- AddForeignKey
ALTER TABLE "quest_catalog_topics" ADD CONSTRAINT "quest_catalog_topics_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "quest_catalog_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semantic_mappings" ADD CONSTRAINT "semantic_mappings_quest_subject_id_fkey" FOREIGN KEY ("quest_subject_id") REFERENCES "quest_catalog_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semantic_mappings" ADD CONSTRAINT "semantic_mappings_quest_topic_id_fkey" FOREIGN KEY ("quest_topic_id") REFERENCES "quest_catalog_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
