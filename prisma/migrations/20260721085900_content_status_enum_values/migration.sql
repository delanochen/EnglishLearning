-- PostgreSQL requires newly added enum values to be committed before a later
-- migration can use them in column defaults. Keep this migration separate
-- from the content-pipeline tables that default to PENDING.
ALTER TYPE "ContentStatus" ADD VALUE 'PENDING';
ALTER TYPE "ContentStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "ContentStatus" ADD VALUE 'PAUSED';
ALTER TYPE "ContentStatus" ADD VALUE 'REVIEW_REQUIRED';
ALTER TYPE "ContentStatus" ADD VALUE 'APPROVED';
ALTER TYPE "ContentStatus" ADD VALUE 'REJECTED';
ALTER TYPE "ContentStatus" ADD VALUE 'FAILED';
ALTER TYPE "ContentStatus" ADD VALUE 'CANCELED';
