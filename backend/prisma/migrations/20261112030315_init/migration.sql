-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'USER');

-- CreateEnum
CREATE TYPE "HealthRecordType" AS ENUM ('VACCINE', 'DEWORMING_INTERNAL', 'DEWORMING_EXTERNAL');

-- CreateEnum
CREATE TYPE "TreatmentStatus" AS ENUM ('ACTIVE', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GroomingServiceType" AS ENUM ('BATH', 'HAIRCUT', 'NAIL_TRIM', 'DENTAL_CLEANING');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "telegram_chat_id" TEXT,
    "telegram_link_code" TEXT,
    "telegram_link_expires_at" TIMESTAMP(3),
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT,
    "breed" TEXT,
    "birth_date" DATE,
    "current_weight_kg" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_records" (
    "id" SERIAL NOT NULL,
    "pet_id" INTEGER NOT NULL,
    "record_type" "HealthRecordType" NOT NULL,
    "name" TEXT NOT NULL,
    "date_given" DATE NOT NULL,
    "next_due_date" DATE,
    "notes" TEXT,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_treatments" (
    "id" SERIAL NOT NULL,
    "pet_id" INTEGER NOT NULL,
    "medicine_name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "frequency_hours" INTEGER NOT NULL,
    "status" "TreatmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "notify_doses" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grooming_logs" (
    "id" SERIAL NOT NULL,
    "pet_id" INTEGER NOT NULL,
    "service_type" "GroomingServiceType" NOT NULL,
    "date_done" DATE NOT NULL,
    "next_due_date" DATE,
    "notes" TEXT,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grooming_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vet_visits" (
    "id" SERIAL NOT NULL,
    "pet_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "diagnosis" TEXT,
    "vet_name" TEXT,
    "weight_kg" DOUBLE PRECISION,
    "notes" TEXT,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vet_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_records" (
    "id" SERIAL NOT NULL,
    "pet_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "vet_visit_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_link_code_key" ON "users"("telegram_link_code");

-- CreateIndex
CREATE INDEX "health_records_pet_id_idx" ON "health_records"("pet_id");

-- CreateIndex
CREATE INDEX "health_records_next_due_date_idx" ON "health_records"("next_due_date");

-- CreateIndex
CREATE INDEX "medication_treatments_pet_id_idx" ON "medication_treatments"("pet_id");

-- CreateIndex
CREATE INDEX "medication_treatments_status_idx" ON "medication_treatments"("status");

-- CreateIndex
CREATE INDEX "grooming_logs_pet_id_idx" ON "grooming_logs"("pet_id");

-- CreateIndex
CREATE INDEX "grooming_logs_next_due_date_idx" ON "grooming_logs"("next_due_date");

-- CreateIndex
CREATE INDEX "vet_visits_pet_id_idx" ON "vet_visits"("pet_id");

-- CreateIndex
CREATE UNIQUE INDEX "weight_records_vet_visit_id_key" ON "weight_records"("vet_visit_id");

-- CreateIndex
CREATE INDEX "weight_records_pet_id_date_idx" ON "weight_records"("pet_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "notification_logs_key_key" ON "notification_logs"("key");

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_treatments" ADD CONSTRAINT "medication_treatments_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_treatments" ADD CONSTRAINT "medication_treatments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grooming_logs" ADD CONSTRAINT "grooming_logs_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grooming_logs" ADD CONSTRAINT "grooming_logs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vet_visits" ADD CONSTRAINT "vet_visits_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vet_visits" ADD CONSTRAINT "vet_visits_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_records" ADD CONSTRAINT "weight_records_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_records" ADD CONSTRAINT "weight_records_vet_visit_id_fkey" FOREIGN KEY ("vet_visit_id") REFERENCES "vet_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
