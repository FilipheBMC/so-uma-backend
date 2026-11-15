/*
  Warnings:

  - A unique constraint covering the columns `[normalized_source_subject,normalized_source_topic]` on the table `semantic_mappings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "uq_semantic_mapping_source" ON "semantic_mappings"("normalized_source_subject", "normalized_source_topic");
