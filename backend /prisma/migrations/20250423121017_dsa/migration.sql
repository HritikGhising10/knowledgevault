-- DropForeignKey
ALTER TABLE "ForumComment" DROP CONSTRAINT "ForumComment_parentId_fkey";

-- DropForeignKey
ALTER TABLE "ForumComment" DROP CONSTRAINT "ForumComment_topicId_fkey";

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ForumTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ForumComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
