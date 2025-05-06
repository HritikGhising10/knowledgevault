/*
  Warnings:

  - Added the required column `fieldType` to the `DataField` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('CHARACTER', 'NUMERIC', 'DATE', 'DATETIME', 'BOOLEAN', 'PACKED_DECIMAL', 'OTHER');

-- DropForeignKey
ALTER TABLE "DataField" DROP CONSTRAINT "DataField_fileId_fkey";

-- DropForeignKey
ALTER TABLE "DataStructure" DROP CONSTRAINT "DataStructure_fileFieldID_fkey";

-- DropForeignKey
ALTER TABLE "ValidData" DROP CONSTRAINT "ValidData_fileFieldID_fkey";

-- AlterTable
ALTER TABLE "DataField" ADD COLUMN     "fieldType" "FieldType" NOT NULL;

-- AddForeignKey
ALTER TABLE "DataField" ADD CONSTRAINT "DataField_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "DataFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidData" ADD CONSTRAINT "ValidData_fileFieldID_fkey" FOREIGN KEY ("fileFieldID") REFERENCES "DataField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataStructure" ADD CONSTRAINT "DataStructure_fileFieldID_fkey" FOREIGN KEY ("fileFieldID") REFERENCES "DataField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
