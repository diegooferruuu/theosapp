/*
  Warnings:

  - You are about to drop the column `telegram_chat_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `telegram_link_code` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `telegram_link_expires_at` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "users_telegram_link_code_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "telegram_chat_id",
DROP COLUMN "telegram_link_code",
DROP COLUMN "telegram_link_expires_at";

-- CreateTable
CREATE TABLE "medication_doses" (
    "id" SERIAL NOT NULL,
    "treatment_id" INTEGER NOT NULL,
    "dose_number" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "given_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "given_by_id" INTEGER,
    "notes" TEXT,

    CONSTRAINT "medication_doses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medication_doses_treatment_id_dose_number_key" ON "medication_doses"("treatment_id", "dose_number");

-- AddForeignKey
ALTER TABLE "medication_doses" ADD CONSTRAINT "medication_doses_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "medication_treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_doses" ADD CONSTRAINT "medication_doses_given_by_id_fkey" FOREIGN KEY ("given_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
