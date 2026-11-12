-- CreateEnum
CREATE TYPE "TreatmentType" AS ENUM ('PILL', 'CAPSULE', 'LIQUID', 'ORAL_DROPS', 'EAR_DROPS', 'EYE_DROPS', 'OINTMENT', 'INJECTION', 'CLEANING', 'MEDICATED_BATH', 'SUPPLEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('INTERVAL', 'FIXED_TIMES', 'AS_NEEDED');

-- CreateEnum
CREATE TYPE "FoodTiming" AS ENUM ('WITH_FOOD', 'FASTING');

-- AlterTable
ALTER TABLE "medication_treatments" ADD COLUMN     "amount" DOUBLE PRECISION,
ADD COLUMN     "every_days" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "food_timing" "FoodTiming",
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "max_per_day" INTEGER,
ADD COLUMN     "min_interval_hours" DOUBLE PRECISION,
ADD COLUMN     "schedule_type" "ScheduleType" NOT NULL DEFAULT 'INTERVAL',
ADD COLUMN     "site" TEXT,
ADD COLUMN     "stock_alert_at" DOUBLE PRECISION,
ADD COLUMN     "stock_quantity" DOUBLE PRECISION,
ADD COLUMN     "strength" TEXT,
ADD COLUMN     "times" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "type" "TreatmentType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "unit" TEXT,
ALTER COLUMN "duration_days" DROP NOT NULL,
ALTER COLUMN "frequency_hours" DROP NOT NULL;
