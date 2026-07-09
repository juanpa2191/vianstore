-- AlterTable
ALTER TABLE "order"
  ADD COLUMN "shipped_email_sent_at" TIMESTAMPTZ(6),
  ADD COLUMN "shipped_email_error" TEXT,
  ADD COLUMN "delivered_email_sent_at" TIMESTAMPTZ(6),
  ADD COLUMN "delivered_email_error" TEXT;
