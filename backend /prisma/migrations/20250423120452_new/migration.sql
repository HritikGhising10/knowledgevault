-- CreateEnum
CREATE TYPE "ForumCategory" AS ENUM ('GENERAL', 'TECHNICAL', 'FEATURE', 'BUGS', 'OTHER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "initials" TEXT;

-- CreateTable
CREATE TABLE "ForumTopic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "category" "ForumCategory" NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "isHot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "ForumTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "ForumComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ForumTopic_authorId_idx" ON "ForumTopic"("authorId");

-- CreateIndex
CREATE INDEX "ForumTopic_category_idx" ON "ForumTopic"("category");

-- CreateIndex
CREATE INDEX "ForumTopic_createdAt_idx" ON "ForumTopic"("createdAt");

-- CreateIndex
CREATE INDEX "ForumComment_authorId_idx" ON "ForumComment"("authorId");

-- CreateIndex
CREATE INDEX "ForumComment_topicId_idx" ON "ForumComment"("topicId");

-- CreateIndex
CREATE INDEX "ForumComment_parentId_idx" ON "ForumComment"("parentId");

-- CreateIndex
CREATE INDEX "ForumComment_createdAt_idx" ON "ForumComment"("createdAt");

-- AddForeignKey
ALTER TABLE "ForumTopic" ADD CONSTRAINT "ForumTopic_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ForumTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ForumComment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
