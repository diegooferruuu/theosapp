-- CreateEnum
CREATE TYPE "SymptomCategory" AS ENUM ('VOMIT', 'DIARRHEA', 'COUGH', 'SNEEZING', 'LIMPING', 'ITCHING', 'NO_APPETITE', 'LETHARGY', 'SKIN', 'EYES', 'EARS', 'BREATHING', 'URINE', 'OTHER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- CreateTable
CREATE TABLE "symptom_logs" (
    "id" SERIAL NOT NULL,
    "pet_id" INTEGER NOT NULL,
    "category" "SymptomCategory" NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'MILD',
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "symptom_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "symptom_photos" (
    "id" SERIAL NOT NULL,
    "symptom_id" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "symptom_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "symptom_logs_pet_id_occurred_at_idx" ON "symptom_logs"("pet_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "symptom_photos_filename_key" ON "symptom_photos"("filename");

-- CreateIndex
CREATE INDEX "symptom_photos_symptom_id_idx" ON "symptom_photos"("symptom_id");

-- AddForeignKey
ALTER TABLE "symptom_logs" ADD CONSTRAINT "symptom_logs_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_logs" ADD CONSTRAINT "symptom_logs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "symptom_photos" ADD CONSTRAINT "symptom_photos_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "symptom_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
