-- CreateTable
CREATE TABLE "Program" (
    "id" BIGSERIAL NOT NULL,
    "programName" TEXT,
    "sourceLocation" TEXT,
    "programType" TEXT,
    "programDesc" TEXT,
    "keyProgrammers" TEXT,
    "keyUsers" TEXT,
    "archive" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" BIGSERIAL NOT NULL,
    "shortName" TEXT,
    "longName" TEXT,
    "fileLocation" TEXT,
    "fileSize" INTEGER,
    "docLink" TEXT,
    "archive" BOOLEAN,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" BIGSERIAL NOT NULL,
    "issueDesc" TEXT,
    "issueResolution" TEXT,
    "reportedBy" TEXT,
    "dateTime" TIMESTAMP(3),
    "userId" TEXT,
    "archive" BOOLEAN,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramKeyFile" (
    "id" SERIAL NOT NULL,
    "programId" BIGINT NOT NULL,
    "fileId" BIGINT NOT NULL,

    CONSTRAINT "ProgramKeyFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueRelevantProgram" (
    "id" SERIAL NOT NULL,
    "issueId" BIGINT NOT NULL,
    "programId" BIGINT NOT NULL,

    CONSTRAINT "IssueRelevantProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueRelevantFile" (
    "id" SERIAL NOT NULL,
    "issueId" BIGINT NOT NULL,
    "fileId" BIGINT NOT NULL,

    CONSTRAINT "IssueRelevantFile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProgramKeyFile" ADD CONSTRAINT "ProgramKeyFile_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramKeyFile" ADD CONSTRAINT "ProgramKeyFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueRelevantProgram" ADD CONSTRAINT "IssueRelevantProgram_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueRelevantProgram" ADD CONSTRAINT "IssueRelevantProgram_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueRelevantFile" ADD CONSTRAINT "IssueRelevantFile_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueRelevantFile" ADD CONSTRAINT "IssueRelevantFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
