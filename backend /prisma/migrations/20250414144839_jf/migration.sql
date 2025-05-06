-- CreateTable
CREATE TABLE "DataFile" (
    "id" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "longName" TEXT NOT NULL,
    "fileLocation" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "docLink" TEXT NOT NULL,
    "archive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "DataFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataField" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fieldSize" INTEGER NOT NULL,
    "packed" BOOLEAN NOT NULL DEFAULT false,
    "begPosition" INTEGER NOT NULL,
    "endPosition" INTEGER NOT NULL,
    "validDataNotes" TEXT NOT NULL,
    "archive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DataField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidData" (
    "id" TEXT NOT NULL,
    "fileFieldID" TEXT NOT NULL,
    "seqID" INTEGER NOT NULL,
    "validData" TEXT NOT NULL,
    "validDataDesc" TEXT NOT NULL,
    "archive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ValidData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataStructure" (
    "id" TEXT NOT NULL,
    "fileFieldID" TEXT NOT NULL,
    "dsID" INTEGER NOT NULL,
    "dsBegPosition" INTEGER NOT NULL,
    "dsEndPosition" INTEGER NOT NULL,
    "dsName" TEXT NOT NULL,
    "dsDesc" TEXT NOT NULL,
    "archive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DataStructure_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DataFile" ADD CONSTRAINT "DataFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataField" ADD CONSTRAINT "DataField_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "DataFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidData" ADD CONSTRAINT "ValidData_fileFieldID_fkey" FOREIGN KEY ("fileFieldID") REFERENCES "DataField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataStructure" ADD CONSTRAINT "DataStructure_fileFieldID_fkey" FOREIGN KEY ("fileFieldID") REFERENCES "DataField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
