-- DropForeignKey
ALTER TABLE "ProgramKeyFile" DROP CONSTRAINT "ProgramKeyFile_dataFileId_fkey";

-- DropForeignKey
ALTER TABLE "ProgramKeyFile" DROP CONSTRAINT "ProgramKeyFile_programId_fkey";

-- DropForeignKey
ALTER TABLE "ProgramNotes" DROP CONSTRAINT "ProgramNotes_programId_fkey";

-- CreateTable
CREATE TABLE "Process" (
    "id" TEXT NOT NULL,
    "processName" TEXT NOT NULL,
    "processDescription" TEXT,
    "programType" TEXT,
    "keyProgrammers" TEXT[],
    "keyUsers" TEXT[],
    "archive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessStep" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "seqID" TEXT NOT NULL,
    "processStep" TEXT NOT NULL,
    "processStepDesc" TEXT,
    "processStepNotes" TEXT,
    "archive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ProcessStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessStepKeyProgram" (
    "processStepId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "seqID" INTEGER NOT NULL,
    "processProgramNotes" TEXT,

    CONSTRAINT "ProcessStepKeyProgram_pkey" PRIMARY KEY ("processStepId","programId","seqID")
);

-- CreateTable
CREATE TABLE "ProcessStepKeyFile" (
    "processStepId" TEXT NOT NULL,
    "dataFileId" TEXT NOT NULL,
    "seqID" INTEGER NOT NULL,
    "processFileNotes" TEXT,

    CONSTRAINT "ProcessStepKeyFile_pkey" PRIMARY KEY ("processStepId","dataFileId","seqID")
);

-- CreateIndex
CREATE INDEX "Process_userId_idx" ON "Process"("userId");

-- CreateIndex
CREATE INDEX "Process_programType_idx" ON "Process"("programType");

-- CreateIndex
CREATE INDEX "ProcessStep_userId_idx" ON "ProcessStep"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessStep_processId_seqID_key" ON "ProcessStep"("processId", "seqID");

-- CreateIndex
CREATE INDEX "ProcessStepKeyProgram_programId_idx" ON "ProcessStepKeyProgram"("programId");

-- CreateIndex
CREATE INDEX "ProcessStepKeyFile_dataFileId_idx" ON "ProcessStepKeyFile"("dataFileId");

-- AddForeignKey
ALTER TABLE "ProgramKeyFile" ADD CONSTRAINT "ProgramKeyFile_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramKeyFile" ADD CONSTRAINT "ProgramKeyFile_dataFileId_fkey" FOREIGN KEY ("dataFileId") REFERENCES "DataFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramNotes" ADD CONSTRAINT "ProgramNotes_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStep" ADD CONSTRAINT "ProcessStep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStep" ADD CONSTRAINT "ProcessStep_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepKeyProgram" ADD CONSTRAINT "ProcessStepKeyProgram_processStepId_fkey" FOREIGN KEY ("processStepId") REFERENCES "ProcessStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepKeyProgram" ADD CONSTRAINT "ProcessStepKeyProgram_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepKeyFile" ADD CONSTRAINT "ProcessStepKeyFile_processStepId_fkey" FOREIGN KEY ("processStepId") REFERENCES "ProcessStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStepKeyFile" ADD CONSTRAINT "ProcessStepKeyFile_dataFileId_fkey" FOREIGN KEY ("dataFileId") REFERENCES "DataFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
