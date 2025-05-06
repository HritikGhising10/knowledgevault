/*
  Warnings:

  - A unique constraint covering the columns `[fileFieldID,dsID]` on the table `DataStructure` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[fileFieldID,seqID]` on the table `ValidData` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DataField" ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "validDataNotes" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DataFile" ALTER COLUMN "fileLocation" DROP NOT NULL,
ALTER COLUMN "docLink" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "runningLocation" TEXT,
    "sourceLocation" TEXT,
    "programType" TEXT,
    "programDescription" TEXT,
    "keyProgrammers" TEXT[],
    "keyUsers" TEXT[],
    "archive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramKeyFile" (
    "programId" TEXT NOT NULL,
    "seqID" INTEGER NOT NULL,
    "dataFileId" TEXT NOT NULL,
    "programFileNotes" TEXT,
    "archive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramKeyFile_pkey" PRIMARY KEY ("programId","seqID")
);

-- CreateTable
CREATE TABLE "ProgramNotes" (
    "programId" TEXT NOT NULL,
    "seqID" INTEGER NOT NULL,
    "programNotes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "archive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramNotes_pkey" PRIMARY KEY ("programId","seqID")
);

-- CreateIndex
CREATE INDEX "Program_userId_idx" ON "Program"("userId");

-- CreateIndex
CREATE INDEX "ProgramKeyFile_dataFileId_idx" ON "ProgramKeyFile"("dataFileId");

-- CreateIndex
CREATE INDEX "ProgramNotes_userId_idx" ON "ProgramNotes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DataStructure_fileFieldID_dsID_key" ON "DataStructure"("fileFieldID", "dsID");

-- CreateIndex
CREATE UNIQUE INDEX "ValidData_fileFieldID_seqID_key" ON "ValidData"("fileFieldID", "seqID");

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramKeyFile" ADD CONSTRAINT "ProgramKeyFile_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramKeyFile" ADD CONSTRAINT "ProgramKeyFile_dataFileId_fkey" FOREIGN KEY ("dataFileId") REFERENCES "DataFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramNotes" ADD CONSTRAINT "ProgramNotes_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramNotes" ADD CONSTRAINT "ProgramNotes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
