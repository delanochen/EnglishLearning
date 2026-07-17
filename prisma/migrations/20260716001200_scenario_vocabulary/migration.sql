CREATE TABLE "ScenarioVocabulary" (
  "id" UUID NOT NULL,
  "lessonId" UUID NOT NULL,
  "word" TEXT NOT NULL,
  "meaningZh" TEXT NOT NULL,
  "example" TEXT,
  "order" INTEGER NOT NULL,
  CONSTRAINT "ScenarioVocabulary_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ScenarioVocabulary_lessonId_word_key" ON "ScenarioVocabulary"("lessonId", "word");
CREATE UNIQUE INDEX "ScenarioVocabulary_lessonId_order_key" ON "ScenarioVocabulary"("lessonId", "order");
ALTER TABLE "ScenarioVocabulary" ADD CONSTRAINT "ScenarioVocabulary_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ScenarioLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
