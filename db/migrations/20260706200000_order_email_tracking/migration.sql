-- AlterTable
ALTER TABLE "order"
  ADD COLUMN "email_sent_at" TIMESTAMPTZ(6),
  ADD COLUMN "email_error" TEXT;
