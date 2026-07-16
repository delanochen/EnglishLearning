CREATE TABLE "VocabularyRelation" (
  "id" UUID NOT NULL, "sourceId" UUID NOT NULL, "targetId" UUID NOT NULL, "type" TEXT NOT NULL,
  CONSTRAINT "VocabularyRelation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VocabularyRelation_sourceId_targetId_type_key" ON "VocabularyRelation"("sourceId", "targetId", "type");
CREATE INDEX "VocabularyRelation_sourceId_type_idx" ON "VocabularyRelation"("sourceId", "type");
ALTER TABLE "VocabularyRelation" ADD CONSTRAINT "VocabularyRelation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VocabularyRelation" ADD CONSTRAINT "VocabularyRelation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
