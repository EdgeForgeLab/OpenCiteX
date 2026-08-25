-- Rename Project to Brand and map fields to the multi-brand model.

ALTER TABLE "Project" RENAME TO "Brand";
ALTER TABLE "Brand" RENAME CONSTRAINT "Project_pkey" TO "Brand_pkey";

ALTER TABLE "Brand" RENAME COLUMN "brandKeywords" TO "aliases";
ALTER TABLE "Brand" RENAME COLUMN "productCategory" TO "industryCategory";
ALTER TABLE "Brand" RENAME COLUMN "painPoint" TO "description";

ALTER TABLE "Brand" ALTER COLUMN "industryCategory" DROP NOT NULL;
ALTER TABLE "Brand" ALTER COLUMN "industryCategory" DROP DEFAULT;
UPDATE "Brand" SET "industryCategory" = NULL WHERE "industryCategory" = '';

ALTER TABLE "Brand" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "Brand" ALTER COLUMN "description" DROP DEFAULT;
UPDATE "Brand" SET "description" = NULL WHERE "description" = '';

ALTER TABLE "Brand" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';

ALTER TABLE "Prompt" DROP CONSTRAINT "Prompt_projectId_fkey";
ALTER TABLE "Prompt" RENAME COLUMN "projectId" TO "brandId";
DROP INDEX IF EXISTS "Prompt_projectId_idx";
CREATE INDEX "Prompt_brandId_idx" ON "Prompt"("brandId");
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
