-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "vet_appointments" (
    "id" SERIAL NOT NULL,
    "pet_id" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "vet_name" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "visit_id" INTEGER,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vet_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vet_appointments_visit_id_key" ON "vet_appointments"("visit_id");

-- CreateIndex
CREATE INDEX "vet_appointments_pet_id_scheduled_at_idx" ON "vet_appointments"("pet_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "vet_appointments_status_scheduled_at_idx" ON "vet_appointments"("status", "scheduled_at");

-- AddForeignKey
ALTER TABLE "vet_appointments" ADD CONSTRAINT "vet_appointments_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vet_appointments" ADD CONSTRAINT "vet_appointments_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "vet_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vet_appointments" ADD CONSTRAINT "vet_appointments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
