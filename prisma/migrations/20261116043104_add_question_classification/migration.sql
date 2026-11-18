-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "subject_name" VARCHAR(200),
ADD COLUMN     "topic_name" VARCHAR(400);

-- CreateIndex
CREATE INDEX "ix_questions_subject_topic" ON "questions"("subject_name", "topic_name");
